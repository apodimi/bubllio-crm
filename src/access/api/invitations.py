import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import (
    EmailAccount, InstallationState, Organization, OrganizationInvitation,
    OrganizationMembership, OrganizationProvisioning, WorkspaceAccessEvent,
)
from accounts.models import UserProfile
from access.permissions import Capability, get_membership, get_organization_for_user
from access.services.invitations import (
    InvitationAlreadyMemberError,
    InvitationRolePermissionError,
    deliver_workspace_invitation,
    token_hash,
)

logger = logging.getLogger(__name__)


class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=[
        OrganizationMembership.Role.ADMIN,
        OrganizationMembership.Role.MEMBER,
        OrganizationMembership.Role.VIEWER,
    ])

    def validate_email(self, value):
        return value.strip().lower()


class InvitationRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    display_name = serializers.CharField(max_length=255, required=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    timezone = serializers.CharField(max_length=64, default="UTC")
    locale = serializers.CharField(max_length=20, default="en-us")

    def validate_username(self, value):
        user_model = get_user_model()
        if user_model.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate(self, attrs):
        candidate = get_user_model()(username=attrs["username"], email=self.context["invited_email"])
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages}) from error
        return attrs


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
        choices=OrganizationInvitation.Status.choices,
        read_only=True,
    )
    invited_by = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationInvitation
        fields = (
            "id",
            "email",
            "role",
            "status",
            "invited_by",
            "created_at",
            "expires_at",
            "accepted_at",
            "revoked_at",
        )

    def get_invited_by(self, invitation):
        return invitation.invited_by.username if invitation.invited_by else None


def _invitation_account(organization):
    account = EmailAccount.objects.filter(
        organization=organization,
        is_default=True,
        is_active=True,
    ).first()
    if account is None:
        fallback_id = InstallationState.objects.values_list(
            "fallback_email_account_id",
            flat=True,
        ).first()
        account = (
            EmailAccount.objects.filter(id=fallback_id, is_active=True).first()
            if fallback_id
            else None
        )
    return account


def _can_manage_invitation_role(requester, role):
    return not (
        requester.role == OrganizationMembership.Role.ADMIN
        and role in {OrganizationMembership.Role.ADMIN, OrganizationMembership.Role.OWNER}
    )


def _serialize_invitation(invitation):
    return OrganizationInvitationSerializer(invitation).data


class OrganizationInvitationListCreateAPIView(APIView):
    throttle_scope = "organization_invitation"

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def _organization(self, request, organization_id):
        return get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_MEMBERS,
        )

    def get(self, request, organization_id):
        organization = self._organization(request, organization_id)
        if organization.is_personal:
            return Response([])
        invitations = organization.invitations.select_related("invited_by").order_by("-created_at")[:100]
        return Response(OrganizationInvitationSerializer(invitations, many=True).data)

    def post(self, request, organization_id):
        organization = self._organization(request, organization_id)
        if organization.is_personal:
            return Response(
                {"detail": "Personal workspaces cannot send invitations."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        requester = get_membership(user=request.user, organization=organization)
        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]
        if not _can_manage_invitation_role(requester, role):
            return Response({"role": "Only an owner can invite administrators."}, status=status.HTTP_403_FORBIDDEN)
        if organization.memberships.filter(user__email__iexact=email).exists():
            return Response({"email": "This person already belongs to the workspace."}, status=status.HTTP_400_BAD_REQUEST)
        account = _invitation_account(organization)
        if account is None:
            return Response({"detail": "Configure an SMTP account in workspace Settings, or configure the installation fallback SMTP first."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invitation = deliver_workspace_invitation(
                organization=organization,
                email=email,
                role=role,
                actor=request.user,
                actor_role=requester.role,
                account=account,
                audit_action=WorkspaceAccessEvent.Action.INVITE_MEMBER,
            )
        except InvitationRolePermissionError:
            return Response(
                {"detail": "Only an owner can replace an administrator invitation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvitationAlreadyMemberError:
            return Response(
                {"email": "This person already belongs to the workspace."},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception:
            logger.exception(
                "Invitation email delivery failed for organization=%s recipient=%s account=%s",
                organization.pk,
                email,
                account.pk,
            )
            return Response({"detail": "The invitation email could not be sent. Check the workspace SMTP account."}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_serialize_invitation(invitation), status=status.HTTP_201_CREATED)


class OrganizationInvitationDetailAPIView(APIView):
    @transaction.atomic
    def delete(self, request, organization_id, invitation_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_MEMBERS,
        )
        requester = get_membership(user=request.user, organization=organization)
        Organization.objects.select_for_update().get(pk=organization.pk)
        invitation = get_object_or_404(
            OrganizationInvitation.objects.select_for_update(),
            id=invitation_id,
            organization=organization,
        )
        if not _can_manage_invitation_role(requester, invitation.role):
            return Response(
                {"detail": "Only an owner can revoke administrator invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if invitation.status == OrganizationInvitation.Status.ACCEPTED:
            return Response(
                {"detail": "Accepted invitations cannot be revoked."},
                status=status.HTTP_409_CONFLICT,
            )
        if invitation.status == OrganizationInvitation.Status.REVOKED:
            return Response(status=status.HTTP_204_NO_CONTENT)
        invitation.revoked_at = timezone.now()
        invitation.save(update_fields=("revoked_at",))
        WorkspaceAccessEvent.objects.create(
            action=WorkspaceAccessEvent.Action.REVOKE_MEMBER_INVITATION,
            actor=request.user,
            organization_id=organization.id,
            details={
                "email": invitation.email,
                "role": invitation.role,
                "invitation_id": str(invitation.id),
            },
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrganizationInvitationResendAPIView(APIView):
    throttle_scope = "organization_invitation"

    def get_throttles(self):
        return [ScopedRateThrottle()]

    def post(self, request, organization_id, invitation_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_MEMBERS,
        )
        requester = get_membership(user=request.user, organization=organization)
        invitation = get_object_or_404(
            OrganizationInvitation,
            id=invitation_id,
            organization=organization,
        )
        if not _can_manage_invitation_role(requester, invitation.role):
            return Response(
                {"detail": "Only an owner can resend administrator invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if invitation.status == OrganizationInvitation.Status.ACCEPTED:
            return Response(
                {"detail": "This person has already accepted the invitation."},
                status=status.HTTP_409_CONFLICT,
            )
        if organization.memberships.filter(user__email__iexact=invitation.email).exists():
            return Response(
                {"detail": "This person already belongs to the workspace."},
                status=status.HTTP_409_CONFLICT,
            )
        account = _invitation_account(organization)
        if account is None:
            return Response(
                {"detail": "Configure an SMTP account before resending invitations."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            replacement = deliver_workspace_invitation(
                organization=organization,
                email=invitation.email,
                role=invitation.role,
                actor=request.user,
                actor_role=requester.role,
                account=account,
                audit_action=WorkspaceAccessEvent.Action.RESEND_MEMBER_INVITATION,
            )
        except InvitationRolePermissionError:
            return Response(
                {"detail": "Only an owner can replace an administrator invitation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvitationAlreadyMemberError:
            return Response(
                {"detail": "This person already belongs to the workspace."},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception:
            logger.exception(
                "Invitation resend failed for organization=%s invitation=%s account=%s",
                organization.pk,
                invitation.pk,
                account.pk,
            )
            return Response(
                {"detail": "The invitation email could not be resent. Check the workspace SMTP account."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(_serialize_invitation(replacement), status=status.HTTP_201_CREATED)


class InvitationDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = get_object_or_404(
            OrganizationInvitation.objects.select_related("organization"),
            token_hash=token_hash(token), accepted_at__isnull=True, revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        return Response({
            "email": invitation.email,
            "organization_name": invitation.organization.name,
            "role": invitation.role,
            "expires_at": invitation.expires_at,
        })


class InvitationAcceptAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, token):
        token_digest = token_hash(token)
        organization_id = get_object_or_404(
            OrganizationInvitation,
            token_hash=token_digest, accepted_at__isnull=True, revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).organization_id
        get_object_or_404(Organization.objects.select_for_update(), id=organization_id)
        invitation = get_object_or_404(
            OrganizationInvitation.objects.select_for_update().select_related("organization"),
            token_hash=token_digest, accepted_at__isnull=True, revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        provisioning = OrganizationProvisioning.objects.select_for_update().filter(
            organization=invitation.organization
        ).first()
        if invitation.role == OrganizationMembership.Role.OWNER:
            if provisioning is None or provisioning.owner_email.casefold() != invitation.email.casefold():
                return Response({"detail": "This owner invitation is no longer valid."}, status=404)
        elif provisioning is not None:
            return Response({"detail": "The workspace is awaiting its owner."}, status=409)
        user_model = get_user_model()
        if request.user.is_authenticated:
            if request.user.email.lower() != invitation.email:
                return Response({"detail": "Sign in with the invited email address."}, status=status.HTTP_403_FORBIDDEN)
            user = request.user
            tokens = None
        else:
            if user_model.objects.filter(email__iexact=invitation.email).exists():
                return Response({"detail": "An account with this email exists. Sign in before accepting the invitation."}, status=status.HTTP_409_CONFLICT)
            serializer = InvitationRegistrationSerializer(data=request.data, context={"invited_email": invitation.email})
            serializer.is_valid(raise_exception=True)
            user = user_model.objects.create_user(
                username=serializer.validated_data["username"],
                email=invitation.email,
                password=serializer.validated_data["password"],
            )
            UserProfile.objects.create(
                user=user,
                display_name=serializer.validated_data["display_name"],
                first_name=serializer.validated_data.get("first_name", ""),
                last_name=serializer.validated_data.get("last_name", ""),
                date_of_birth=serializer.validated_data.get("date_of_birth"),
                timezone=serializer.validated_data.get("timezone", "UTC"),
                locale=serializer.validated_data.get("locale", "en-us"),
                onboarding_completed_at=timezone.now(),
            )
            refresh = RefreshToken.for_user(user)
            tokens = {"access": str(refresh.access_token), "refresh": str(refresh)}
        if provisioning is not None:
            OrganizationMembership.objects.filter(
                organization=invitation.organization,
                user=provisioning.creator,
                role=OrganizationMembership.Role.OWNER,
            ).delete()
            membership, created = OrganizationMembership.objects.get_or_create(
                organization=invitation.organization,
                user=user,
                defaults={"role": OrganizationMembership.Role.OWNER},
            )
            if not created and membership.role != OrganizationMembership.Role.OWNER:
                membership.role = OrganizationMembership.Role.OWNER
                membership.save(update_fields=("role", "updated_at"))
            provisioning.delete()
            WorkspaceAccessEvent.objects.create(
                action=WorkspaceAccessEvent.Action.ACCEPT_OWNER_INVITATION,
                actor=user,
                target_user=user,
                organization_id=invitation.organization_id,
            )
        else:
            membership, created = OrganizationMembership.objects.get_or_create(
                organization=invitation.organization,
                user=user,
                defaults={"role": invitation.role},
            )
            WorkspaceAccessEvent.objects.create(
                action=WorkspaceAccessEvent.Action.ACCEPT_MEMBER_INVITATION,
                actor=user,
                target_user=user,
                organization_id=invitation.organization_id,
                details={"email": invitation.email, "role": membership.role},
            )
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=("accepted_at",))
        return Response({
            "organization_id": str(invitation.organization_id),
            "role": membership.role,
            "membership_created": created,
            "tokens": tokens,
        }, status=status.HTTP_201_CREATED)

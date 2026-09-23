import hashlib
import logging
import secrets
from datetime import timedelta

from django.conf import settings
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

from ..services.email_service import send_invitation_email
from ..models import (
    EmailAccount, InstallationState, Organization, OrganizationInvitation,
    OrganizationMembership, OrganizationProvisioning, WorkspaceAccessEvent,
)
from accounts.models import UserProfile
from ..permissions import Capability, get_membership, get_organization_for_user

logger = logging.getLogger(__name__)


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


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
        invitations = organization.invitations.filter(accepted_at__isnull=True, expires_at__gt=timezone.now()).order_by("-created_at")
        return Response([{
            "id": str(invite.id), "email": invite.email, "role": invite.role,
            "expires_at": invite.expires_at,
        } for invite in invitations])

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
        if requester and requester.role == OrganizationMembership.Role.ADMIN and role == OrganizationMembership.Role.ADMIN:
            return Response({"role": "Only an owner can invite administrators."}, status=status.HTTP_403_FORBIDDEN)
        if organization.memberships.filter(user__email__iexact=email).exists():
            return Response({"email": "This person already belongs to the workspace."}, status=status.HTTP_400_BAD_REQUEST)
        account = EmailAccount.objects.filter(organization=organization, is_default=True, is_active=True).first()
        if account is None:
            fallback_id = InstallationState.objects.values_list("fallback_email_account_id", flat=True).first()
            account = EmailAccount.objects.filter(id=fallback_id, is_active=True).first() if fallback_id else None
        if account is None:
            return Response({"detail": "Configure an SMTP account in workspace Settings, or configure the installation fallback SMTP first."}, status=status.HTTP_400_BAD_REQUEST)

        token = secrets.token_urlsafe(32)
        base_url = getattr(settings, "BUBLLIO_APP_URL", "").rstrip("/") or request.build_absolute_uri("/").rstrip("/")
        invite_url = f"{base_url}/invite/{token}"
        try:
            with transaction.atomic():
                OrganizationInvitation.objects.filter(
                    organization=organization, email__iexact=email, accepted_at__isnull=True,
                ).delete()
                invitation = OrganizationInvitation.objects.create(
                    organization=organization, email=email, role=role,
                    token_hash=token_hash(token), invited_by=request.user,
                    expires_at=timezone.now() + timedelta(days=7),
                )
                send_invitation_email(
                    account=account, recipient=email,
                    organization_name=organization.name, invite_url=invite_url,
                )
        except Exception:
            logger.exception(
                "Invitation email delivery failed for organization=%s recipient=%s account=%s",
                organization.pk,
                email,
                account.pk,
            )
            return Response({"detail": "The invitation email could not be sent. Check the workspace SMTP account."}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({
            "id": str(invitation.id), "email": email, "role": role,
            "expires_at": invitation.expires_at,
        }, status=status.HTTP_201_CREATED)


class InvitationDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = get_object_or_404(
            OrganizationInvitation.objects.select_related("organization"),
            token_hash=token_hash(token), accepted_at__isnull=True,
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
            token_hash=token_digest,
            accepted_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).organization_id
        get_object_or_404(Organization.objects.select_for_update(), id=organization_id)
        invitation = get_object_or_404(
            OrganizationInvitation.objects.select_for_update().select_related("organization"),
            token_hash=token_digest, accepted_at__isnull=True,
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
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=("accepted_at",))
        return Response({
            "organization_id": str(invitation.organization_id),
            "role": membership.role,
            "membership_created": created,
            "tokens": tokens,
        }, status=status.HTTP_201_CREATED)

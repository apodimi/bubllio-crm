import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from access.api.invitation_serializers import (
    InvitationAcceptanceSerializer,
    InvitationCreateSerializer,
    InvitationDetailSerializer,
    InvitationRegistrationSerializer,
    OrganizationInvitationSerializer,
)
from access.permissions import Capability, get_membership, get_organization_for_user
from access.services.invitations import (
    InvitationAcceptanceError,
    InvitationAlreadyMemberError,
    InvitationRolePermissionError,
    accept_workspace_invitation,
    deliver_workspace_invitation,
    invitation_email_account,
    token_hash,
)
from organizations.models import (
    Organization,
    OrganizationInvitation,
    OrganizationMembership,
    WorkspaceAccessEvent,
)

logger = logging.getLogger(__name__)


def _invitation_account(organization):
    return invitation_email_account(organization)


def _can_manage_invitation_role(requester, role):
    return not (
        requester.role == OrganizationMembership.Role.ADMIN
        and role in {OrganizationMembership.Role.ADMIN, OrganizationMembership.Role.OWNER}
    )


def _serialize_invitation(invitation):
    return OrganizationInvitationSerializer(invitation).data


class OrganizationInvitationListCreateAPIView(APIView):
    serializer_class = OrganizationInvitationSerializer
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
                "Invitation could not be queued for organization=%s recipient=%s account=%s",
                organization.pk,
                email,
                account.pk,
            )
            return Response(
                {"detail": "The invitation could not be queued. Check the server logs."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(_serialize_invitation(invitation), status=status.HTTP_201_CREATED)


class OrganizationInvitationDetailAPIView(APIView):
    serializer_class = OrganizationInvitationSerializer

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
    serializer_class = OrganizationInvitationSerializer
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
                "Invitation resend could not be queued for organization=%s invitation=%s account=%s",
                organization.pk,
                invitation.pk,
                account.pk,
            )
            return Response(
                {"detail": "The invitation could not be queued. Check the server logs."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(_serialize_invitation(replacement), status=status.HTTP_201_CREATED)


class InvitationDetailAPIView(APIView):
    serializer_class = InvitationDetailSerializer
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
    serializer_class = InvitationAcceptanceSerializer
    permission_classes = [AllowAny]

    def post(self, request, token):
        registration_data = None
        if not request.user.is_authenticated:
            invitation = get_object_or_404(
                OrganizationInvitation,
                token_hash=token_hash(token),
                accepted_at__isnull=True,
                revoked_at__isnull=True,
                expires_at__gt=timezone.now(),
            )
            if get_user_model().objects.filter(email__iexact=invitation.email).exists():
                return Response(
                    {
                        "detail": "An account with this email exists. Sign in before accepting the invitation."
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            serializer = InvitationRegistrationSerializer(
                data=request.data, context={"invited_email": invitation.email}
            )
            serializer.is_valid(raise_exception=True)
            registration_data = serializer.validated_data
        try:
            result = accept_workspace_invitation(
                token=token,
                authenticated_user=request.user,
                registration_data=registration_data,
            )
        except InvitationAcceptanceError as error:
            return Response({"detail": error.detail}, status=error.status_code)
        return Response({
            "organization_id": str(result.organization_id),
            "role": result.role,
            "membership_created": result.membership_created,
            "tokens": result.tokens,
        }, status=status.HTTP_201_CREATED)

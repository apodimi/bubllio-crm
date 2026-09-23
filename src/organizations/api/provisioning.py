import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import (
    Organization,
    OrganizationInvitation,
    OrganizationMembership,
    OrganizationProvisioning,
    WorkspaceAccessEvent,
    WorkspaceCreatorGrant,
)
from access.permissions import IsInstallationAdmin
from ..services.provisioning import send_owner_invitation

logger = logging.getLogger(__name__)


class WorkspaceCreatorGrantAPIView(APIView):
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        grants = WorkspaceCreatorGrant.objects.select_related("user").order_by("created_at")
        return Response(
            [
                {
                    "id": str(grant.id),
                    "user_id": grant.user_id,
                    "username": grant.user.get_username(),
                    "email": grant.user.email,
                    "granted_at": grant.created_at,
                }
                for grant in grants
            ]
        )

    def post(self, request):
        try:
            email = serializers.EmailField().run_validation(request.data.get("email"))
            email = email.strip().lower()
        except serializers.ValidationError as error:
            return Response({"email": error.detail}, status=status.HTTP_400_BAD_REQUEST)
        users = list(get_user_model().objects.filter(email__iexact=email, is_active=True)[:2])
        if len(users) != 1:
            return Response(
                {"email": ["Choose one existing active account with this email."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            grant, created = WorkspaceCreatorGrant.objects.get_or_create(
                user=users[0], defaults={"granted_by": request.user}
            )
            if created:
                WorkspaceAccessEvent.objects.create(
                    action=WorkspaceAccessEvent.Action.GRANT_CREATOR,
                    actor=request.user,
                    target_user=users[0],
                )
        return Response(
            {"id": str(grant.id), "user_id": grant.user_id, "email": grant.user.email},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class WorkspaceCreatorGrantDetailAPIView(APIView):
    permission_classes = [IsInstallationAdmin]

    def delete(self, request, grant_id):
        with transaction.atomic():
            grant = get_object_or_404(WorkspaceCreatorGrant, id=grant_id)
            user_id = grant.user_id
            grant.delete()
            WorkspaceAccessEvent.objects.create(
                action=WorkspaceAccessEvent.Action.REVOKE_CREATOR,
                actor=request.user,
                target_user_id=user_id,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceProvisioningListAPIView(APIView):
    def get(self, request):
        pending = OrganizationProvisioning.objects.select_related("organization")
        if not request.user.is_active:
            return Response([])
        if not (request.user.is_active and request.user.is_superuser):
            pending = pending.filter(creator=request.user)
        return Response(
            [
                {
                    "organization_id": str(item.organization_id),
                    "name": item.organization.name,
                    "slug": item.organization.slug,
                    "owner_email": item.owner_email,
                    "created_at": item.created_at,
                }
                for item in pending.order_by("created_at")
            ]
        )


class WorkspaceProvisioningDetailAPIView(APIView):
    throttle_scope = "workspace_provisioning"

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def _pending(self, request, organization_id):
        if not request.user.is_active:
            return None
        get_object_or_404(Organization.objects.select_for_update(), id=organization_id)
        pending = get_object_or_404(
            OrganizationProvisioning.objects.select_for_update().select_related("organization"),
            organization_id=organization_id,
        )
        if pending.creator_id != request.user.id and not (
            request.user.is_active and request.user.is_superuser
        ):
            return None
        return pending

    def delete(self, request, organization_id):
        with transaction.atomic():
            pending = self._pending(request, organization_id)
            if pending is None:
                return Response(status=status.HTTP_404_NOT_FOUND)
            WorkspaceAccessEvent.objects.create(
                action=WorkspaceAccessEvent.Action.CANCEL_WORKSPACE,
                actor=request.user,
                organization_id=pending.organization_id,
            )
            pending.organization.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def post(self, request, organization_id):
        try:
            with transaction.atomic():
                pending = self._pending(request, organization_id)
                if pending is None:
                    return Response(status=status.HTTP_404_NOT_FOUND)
                OrganizationInvitation.objects.filter(
                    organization=pending.organization,
                    role=OrganizationMembership.Role.OWNER,
                    accepted_at__isnull=True,
                ).delete()
                send_owner_invitation(
                    organization=pending.organization,
                    owner_email=pending.owner_email,
                    creator=request.user,
                    request=request,
                )
                WorkspaceAccessEvent.objects.create(
                    action=WorkspaceAccessEvent.Action.RESEND_OWNER_INVITATION,
                    actor=request.user,
                    organization_id=pending.organization_id,
                )
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Owner invitation delivery failed for organization=%s", organization_id)
            return Response(
                {"detail": "The owner invitation could not be sent."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"detail": "Owner invitation sent."})

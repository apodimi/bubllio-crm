"""Workspace-scoped activity and portable data export for owners and admins."""

from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user
from onboarding.services.data_export import build_workspace_data_export
from organizations.models import WorkspaceAccessEvent


class WorkspaceActivityAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_SETTINGS,
        )
        events = (
            WorkspaceAccessEvent.objects.filter(organization_id=organization.id)
            .select_related("actor", "target_user")
            .order_by("-created_at")[:100]
        )
        response = Response([
            {
                "id": event.pk,
                "action": event.get_action_display(),
                "actor": event.actor.username if event.actor else "Deleted user",
                "target": event.target_user.username if event.target_user else None,
                "details": event.details,
                "created_at": event.created_at,
            }
            for event in events
        ])
        response["Cache-Control"] = "private, no-store"
        return response


class WorkspaceDataExportAPIView(APIView):
    @transaction.atomic
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_SETTINGS,
        )
        export = {
            "format": "bubllio-workspace-export",
            "format_version": 1,
            "generated_at": timezone.now(),
            "workspace": build_workspace_data_export(organization),
        }
        WorkspaceAccessEvent.objects.create(
            action=WorkspaceAccessEvent.Action.DOWNLOAD_WORKSPACE_EXPORT,
            actor=request.user,
            organization_id=organization.id,
        )
        timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        response = Response(export)
        response["Content-Disposition"] = (
            f'attachment; filename="bubllio-{organization.slug}-{timestamp}.json"'
        )
        response["Cache-Control"] = "private, no-store"
        return response

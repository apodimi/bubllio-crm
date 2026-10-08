from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from organizations.models import WorkspaceAccessEvent
from .schema_serializers import AuditEventSerializer


class InstallationAuditLogAPIView(APIView):
    serializer_class = AuditEventSerializer
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        events = (
            WorkspaceAccessEvent.objects.select_related("actor", "target_user")
            .order_by("-created_at")[:100]
        )
        response = Response(
            [
                {
                    "id": event.pk,
                    "action": event.get_action_display(),
                    "actor": event.actor.username if event.actor else "Deleted user",
                    "target": event.target_user.username if event.target_user else None,
                    "organization_id": str(event.organization_id) if event.organization_id else None,
                    "details": event.details,
                    "created_at": event.created_at,
                }
                for event in events
            ]
        )
        response["Cache-Control"] = "private, no-store"
        return response

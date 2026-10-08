from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.services.data_export import build_installation_data_export
from organizations.models import WorkspaceAccessEvent
from .schema_serializers import DataExportSerializer


class InstallationDataExportAPIView(APIView):
    serializer_class = DataExportSerializer
    permission_classes = [IsInstallationAdmin]

    @transaction.atomic
    def get(self, request):
        export = build_installation_data_export()
        WorkspaceAccessEvent.objects.create(
            action=WorkspaceAccessEvent.Action.DOWNLOAD_DATA_EXPORT,
            actor=request.user,
        )
        timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        response = Response(export)
        response["Content-Disposition"] = (
            f'attachment; filename="bubllio-data-export-{timestamp}.json"'
        )
        response["Cache-Control"] = "private, no-store"
        return response

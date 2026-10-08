from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.services.backup_status import get_backup_status
from .schema_serializers import BackupStatusSerializer


class InstallationBackupStatusAPIView(APIView):
    serializer_class = BackupStatusSerializer
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        response = Response(get_backup_status())
        response["Cache-Control"] = "private, no-store"
        return response

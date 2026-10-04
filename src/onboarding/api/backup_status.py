from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.services.backup_status import get_backup_status


class InstallationBackupStatusAPIView(APIView):
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        response = Response(get_backup_status())
        response["Cache-Control"] = "private, no-store"
        return response

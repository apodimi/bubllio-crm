from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.services.update_checker import get_update_status
from .schema_serializers import UpdateStatusSerializer


class InstallationUpdateStatusAPIView(APIView):
    serializer_class = UpdateStatusSerializer
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        response = Response(get_update_status())
        response["Cache-Control"] = "private, no-store"
        return response

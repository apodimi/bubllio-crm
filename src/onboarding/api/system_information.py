from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.services.system_information import get_system_information
from .schema_serializers import SystemInformationSerializer


class InstallationSystemInformationAPIView(APIView):
    serializer_class = SystemInformationSerializer
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        response = Response(get_system_information())
        response["Cache-Control"] = "private, no-store"
        return response

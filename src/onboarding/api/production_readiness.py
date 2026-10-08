from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.services.production_readiness import get_production_readiness
from .schema_serializers import ProductionReadinessSerializer


class InstallationProductionReadinessAPIView(APIView):
    serializer_class = ProductionReadinessSerializer
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        response = Response(get_production_readiness())
        response["Cache-Control"] = "private, no-store"
        return response

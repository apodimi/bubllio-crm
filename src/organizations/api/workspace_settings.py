"""Per-workspace preferences and the choices used to edit them."""

from rest_framework.response import Response
from rest_framework.views import APIView

from ..choices import locale_choices, timezone_choices
from organizations.models import OrganizationSettings, WorkspaceAccessEvent
from access.permissions import Capability, get_organization_for_user
from organizations.serializers import OrganizationSettingsSerializer
from .schema_serializers import OrganizationSettingsOptionsSerializer


class OrganizationSettingsAPIView(APIView):
    serializer_class = OrganizationSettingsSerializer

    def get_organization(self, request, organization_id, capability):
        return get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=capability,
        )

    def get(self, request, organization_id):
        organization = self.get_organization(request, organization_id, Capability.VIEW_CRM)
        settings, _ = OrganizationSettings.objects.get_or_create(organization=organization)
        return Response(OrganizationSettingsSerializer(settings).data)

    def patch(self, request, organization_id):
        organization = self.get_organization(request, organization_id, Capability.MANAGE_SETTINGS)
        settings, _ = OrganizationSettings.objects.get_or_create(organization=organization)
        serializer = OrganizationSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        WorkspaceAccessEvent.objects.create(
            action=WorkspaceAccessEvent.Action.UPDATE_WORKSPACE_SETTINGS,
            actor=request.user,
            organization_id=organization.id,
            details={"changed_fields": sorted(serializer.validated_data.keys())},
        )
        return Response(serializer.data)


class OrganizationSettingsOptionsAPIView(APIView):
    serializer_class = OrganizationSettingsOptionsSerializer
    """Return the choices used by organization-settings forms."""

    def get(self, request):
        return Response(
            {
                "timezones": [{"value": value, "label": label} for value, label in timezone_choices()],
                "locales": [{"value": value, "label": label} for value, label in locale_choices()],
            }
        )

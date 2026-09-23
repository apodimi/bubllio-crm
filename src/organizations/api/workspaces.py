"""Shared and personal workspace endpoints."""

import logging

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import InstallationState, Organization
from ..permissions import Capability, can_create_workspace, get_organization_for_user
from ..serializers import OrganizationSerializer
from ..services.personal_workspace import ensure_personal_workspace
from ..services.provisioning import create_workspace

logger = logging.getLogger(__name__)


class PersonalWorkspaceAPIView(APIView):
    def get(self, request):
        state = InstallationState.objects.get(pk=1)
        return Response({
            "allowed": state.allow_personal_workspaces,
            "exists": Organization.objects.filter(personal_owner=request.user).exists(),
        })

    def post(self, request):
        state = InstallationState.objects.get(pk=1)
        if not state.allow_personal_workspaces:
            return Response(
                {"detail": "Personal workspaces are disabled by the installation administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )
        existed = Organization.objects.filter(personal_owner=request.user).exists()
        organization = ensure_personal_workspace(request.user)
        return Response(
            OrganizationSerializer(organization, context={"request": request}).data,
            status=status.HTTP_200_OK if existed else status.HTTP_201_CREATED,
        )


class OrganizationListCreateAPIView(APIView):
    throttle_scope = "workspace_provisioning"

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        organizations = Organization.objects.filter(
            memberships__user=request.user, provisioning__isnull=True
        )
        serializer = OrganizationSerializer(
            organizations.distinct(),
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request):
        if not can_create_workspace(request.user):
            return Response(
                {"detail": "Workspace creator permission is required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        owner_email = request.data.get("owner_email")
        if not owner_email and request.user.is_superuser:
            owner_email = request.user.email or ""
        if owner_email:
            try:
                owner_email = serializers.EmailField().run_validation(owner_email).strip().lower()
            except serializers.ValidationError as error:
                return Response({"owner_email": error.detail}, status=status.HTTP_400_BAD_REQUEST)
        elif not request.user.is_superuser:
            return Response({"owner_email": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        serializer = OrganizationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            organization = create_workspace(
                serializer=serializer, creator=request.user, owner_email=owner_email, request=request
            )
        except ValueError as error:
            return Response({"owner_email": [str(error)]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Workspace creation or owner invitation failed for user=%s", request.user.pk)
            return Response(
                {"detail": "The owner invitation could not be sent. Check installation SMTP."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(
            {
                **OrganizationSerializer(organization, context={"request": request}).data,
                "owner_invitation_pending": owner_email.casefold() != request.user.email.casefold(),
            },
            status=status.HTTP_201_CREATED,
        )


class OrganizationDetailAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        return Response(
            OrganizationSerializer(organization, context={"request": request}).data
        )

    def delete(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.DELETE_ORGANIZATION,
        )
        if organization.is_personal:
            return Response(
                {"detail": "Personal workspaces cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        organization.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

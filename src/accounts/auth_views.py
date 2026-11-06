from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Organization
from access.permissions import can_create_workspace
from access.suite_auth import SuitePrincipal, suite_organizations
from access.models import SuiteOrganizationLink
from rest_framework.exceptions import NotFound, PermissionDenied
from organizations.serializers import OrganizationSerializer
from .serializers import CurrentUserSerializer, LogoutSerializer


class CurrentUserAPIView(APIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organizations = Organization.objects.all()
        organizations = organizations.filter(memberships__user=request.user, provisioning__isnull=True)
        organizations = suite_organizations(request, organizations.distinct())
        if isinstance(request.auth, SuitePrincipal) and not organizations.exists():
            raise PermissionDenied("No CRM organization is currently granted in Core.")
        return Response(
            {
                "id": request.user.id,
                "username": request.user.get_username(),
                "email": request.user.email,
                "is_superuser": request.user.is_superuser and not isinstance(request.auth, SuitePrincipal),
                "can_create_workspaces": can_create_workspace(request.user) and not isinstance(request.auth, SuitePrincipal),
                "organizations": OrganizationSerializer(
                    organizations.distinct(),
                    many=True,
                    context={"request": request},
                ).data,
            }
        )


class LogoutAPIView(APIView):
    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"refresh": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response(
                {"refresh": "The refresh token is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuiteResolveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not isinstance(request.auth, SuitePrincipal):
            raise NotFound()
        from uuid import UUID
        from access.suite_auth import check_core_access

        try:
            core_id = UUID(request.query_params.get("organization_id", ""))
        except ValueError as error:
            raise NotFound() from error
        link = SuiteOrganizationLink.objects.select_related("organization").filter(
            core_organization_id=core_id,
            organization__memberships__user=request.user,
            organization__provisioning__isnull=True,
        ).first()
        if not link:
            raise NotFound()
        check_core_access(request.auth, core_id)
        return Response({"organization_id": link.organization_id})

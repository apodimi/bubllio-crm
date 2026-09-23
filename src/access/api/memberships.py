"""Workspace membership listing, role changes, and removal."""

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.models import OrganizationMembership
from access.permissions import Capability, get_membership, get_organization_for_user
from organizations.serializers import OrganizationMembershipSerializer


class OrganizationMembershipListAPIView(APIView):
    def _organization(self, request, organization_id):
        return get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_MEMBERS,
        )

    def get(self, request, organization_id):
        organization = self._organization(request, organization_id)
        if organization.is_personal:
            return Response([])
        memberships = organization.memberships.select_related("user").order_by("created_at")
        return Response(OrganizationMembershipSerializer(memberships, many=True).data)


class OrganizationMembershipDetailAPIView(APIView):
    def _context(self, request, organization_id, membership_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_MEMBERS,
        )
        requester = get_membership(user=request.user, organization=organization)
        target = get_object_or_404(
            OrganizationMembership.objects.select_related("user"),
            id=membership_id,
            organization=organization,
        )
        return organization, requester, target

    @transaction.atomic
    def patch(self, request, organization_id, membership_id):
        organization, requester, target = self._context(
            request, organization_id, membership_id
        )
        requested_role = request.data.get("role")
        valid_roles = OrganizationMembership.Role.values
        if requested_role not in valid_roles:
            return Response(
                {"role": [f"Role must be one of: {', '.join(valid_roles)}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requester_is_owner = requester is None or requester.role == OrganizationMembership.Role.OWNER
        if requested_role == OrganizationMembership.Role.OWNER:
            if not requester_is_owner:
                return Response(
                    {"role": "Only the owner can transfer ownership."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if target.role != OrganizationMembership.Role.OWNER:
                OrganizationMembership.objects.select_for_update().filter(
                    organization=organization,
                    role=OrganizationMembership.Role.OWNER,
                ).update(role=OrganizationMembership.Role.ADMIN)
                target.role = OrganizationMembership.Role.OWNER
                target.save(update_fields=("role", "updated_at"))
        else:
            if target.role == OrganizationMembership.Role.OWNER:
                return Response(
                    {"role": "Transfer ownership before changing the current owner."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not requester_is_owner and (
                target.role == OrganizationMembership.Role.ADMIN
                or requested_role == OrganizationMembership.Role.ADMIN
            ):
                return Response(
                    {"role": "Administrators can manage only members and viewers."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            target.role = requested_role
            target.save(update_fields=("role", "updated_at"))

        return Response(OrganizationMembershipSerializer(target).data)

    def delete(self, request, organization_id, membership_id):
        _, requester, target = self._context(request, organization_id, membership_id)
        requester_is_owner = requester is None or requester.role == OrganizationMembership.Role.OWNER
        if target.role == OrganizationMembership.Role.OWNER:
            return Response(
                {"detail": "Transfer ownership before removing the owner."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not requester_is_owner and target.role == OrganizationMembership.Role.ADMIN:
            return Response(
                {"detail": "Administrators cannot remove other administrators."},
                status=status.HTTP_403_FORBIDDEN,
            )
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

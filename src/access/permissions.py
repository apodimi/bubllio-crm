from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission

from organizations.models import Organization, OrganizationMembership, WorkspaceCreatorGrant


class IsInstallationAdmin(BasePermission):
    """Installation configuration is reserved for active Django superusers."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.is_superuser)


class Capability:
    VIEW_CRM = "view_crm"
    MANAGE_CRM = "manage_crm"
    MANAGE_AUTOMATIONS = "manage_automations"
    MANAGE_MEMBERS = "manage_members"
    DELETE_ORGANIZATION = "delete_organization"
    MANAGE_SETTINGS = "manage_settings"


ROLE_CAPABILITIES = {
    OrganizationMembership.Role.OWNER: {
        Capability.VIEW_CRM,
        Capability.MANAGE_CRM,
        Capability.MANAGE_AUTOMATIONS,
        Capability.MANAGE_MEMBERS,
        Capability.DELETE_ORGANIZATION,
        Capability.MANAGE_SETTINGS,
    },
    OrganizationMembership.Role.ADMIN: {
        Capability.VIEW_CRM,
        Capability.MANAGE_CRM,
        Capability.MANAGE_AUTOMATIONS,
        Capability.MANAGE_MEMBERS,
        Capability.MANAGE_SETTINGS,
    },
    OrganizationMembership.Role.MEMBER: {
        Capability.VIEW_CRM,
        Capability.MANAGE_CRM,
    },
    OrganizationMembership.Role.VIEWER: {Capability.VIEW_CRM},
}


def roles_with_capability(capability):
    return [role for role, capabilities in ROLE_CAPABILITIES.items() if capability in capabilities]


def can_create_workspace(user):
    return bool(
        user and user.is_authenticated and user.is_active
        and (user.is_superuser or WorkspaceCreatorGrant.objects.filter(user=user).exists())
    )


def get_organization_for_user(*, user, organization_id, capability):
    organizations = Organization.objects.filter(
        memberships__user=user,
        memberships__role__in=roles_with_capability(capability),
        provisioning__isnull=True,
    )
    return get_object_or_404(organizations.distinct(), id=organization_id)


def get_membership(*, user, organization):
    return get_object_or_404(
        OrganizationMembership,
        user=user,
        organization=organization,
    )

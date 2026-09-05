from django.shortcuts import get_object_or_404

from .models import Organization, OrganizationMembership


class Capability:
    VIEW_CRM = "view_crm"
    MANAGE_CRM = "manage_crm"
    MANAGE_AUTOMATIONS = "manage_automations"
    MANAGE_MEMBERS = "manage_members"
    DELETE_ORGANIZATION = "delete_organization"


ROLE_CAPABILITIES = {
    OrganizationMembership.Role.OWNER: {
        Capability.VIEW_CRM,
        Capability.MANAGE_CRM,
        Capability.MANAGE_AUTOMATIONS,
        Capability.MANAGE_MEMBERS,
        Capability.DELETE_ORGANIZATION,
    },
    OrganizationMembership.Role.ADMIN: {
        Capability.VIEW_CRM,
        Capability.MANAGE_CRM,
        Capability.MANAGE_AUTOMATIONS,
        Capability.MANAGE_MEMBERS,
    },
    OrganizationMembership.Role.MEMBER: {
        Capability.VIEW_CRM,
        Capability.MANAGE_CRM,
    },
    OrganizationMembership.Role.VIEWER: {Capability.VIEW_CRM},
}


def roles_with_capability(capability):
    return [role for role, capabilities in ROLE_CAPABILITIES.items() if capability in capabilities]


def get_organization_for_user(*, user, organization_id, capability):
    organizations = Organization.objects.all()
    if not user.is_superuser:
        organizations = organizations.filter(
            memberships__user=user,
            memberships__role__in=roles_with_capability(capability),
        )
    return get_object_or_404(organizations.distinct(), id=organization_id)


def get_membership(*, user, organization):
    if user.is_superuser:
        return None
    return get_object_or_404(
        OrganizationMembership,
        user=user,
        organization=organization,
    )

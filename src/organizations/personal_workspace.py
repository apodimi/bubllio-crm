import uuid

from django.db import transaction
from django.utils.text import slugify

from .models import Organization, OrganizationMembership, OrganizationSettings


@transaction.atomic
def ensure_personal_workspace(user):
    """Return the user's private workspace, creating it exactly once."""
    existing = Organization.objects.filter(personal_owner=user).first()
    if existing:
        return existing

    base_slug = slugify(f"{user.get_username()}-personal")[:220] or "personal"
    slug = base_slug
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
    name = f"{user.get_username()}'s workspace"
    organization = Organization.objects.create(
        name=name,
        slug=slug,
        is_personal=True,
        personal_owner=user,
    )
    OrganizationMembership.objects.create(
        organization=organization,
        user=user,
        role=OrganizationMembership.Role.OWNER,
    )
    OrganizationSettings.objects.create(organization=organization)
    return organization

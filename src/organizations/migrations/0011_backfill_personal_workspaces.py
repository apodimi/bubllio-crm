from django.db import migrations
from django.utils.text import slugify


def backfill_personal_workspaces(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    Membership = apps.get_model("organizations", "OrganizationMembership")
    Settings = apps.get_model("organizations", "OrganizationSettings")

    for user in User.objects.all().iterator():
        if Organization.objects.filter(personal_owner_id=user.pk).exists():
            continue
        base_slug = slugify(f"{user.username}-personal")[:220] or "personal"
        slug = base_slug
        suffix = 1
        while Organization.objects.filter(slug=slug).exists():
            suffix += 1
            slug = f"{base_slug}-{suffix}"
        organization = Organization.objects.create(
            name=f"{user.username}'s workspace",
            slug=slug,
            is_personal=True,
            personal_owner_id=user.pk,
        )
        Membership.objects.create(
            organization_id=organization.pk,
            user_id=user.pk,
            role="owner",
        )
        Settings.objects.create(organization_id=organization.pk)


class Migration(migrations.Migration):
    dependencies = [("organizations", "0010_organization_is_personal_organization_personal_owner")]
    operations = [migrations.RunPython(backfill_personal_workspaces, migrations.RunPython.noop)]

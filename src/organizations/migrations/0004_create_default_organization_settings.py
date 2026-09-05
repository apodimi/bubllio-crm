from django.db import migrations


def create_default_settings(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    OrganizationSettings = apps.get_model("organizations", "OrganizationSettings")
    OrganizationSettings.objects.bulk_create(
        [
            OrganizationSettings(organization_id=organization.id)
            for organization in Organization.objects.filter(settings__isnull=True).only("id")
        ]
    )


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_organizationsettings_emailaccount"),
    ]

    operations = [
        migrations.RunPython(create_default_settings, migrations.RunPython.noop),
    ]

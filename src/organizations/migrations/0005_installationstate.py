from django.db import migrations, models


def create_installation_state(apps, schema_editor):
    state = apps.get_model("organizations", "InstallationState")
    state.objects.using(schema_editor.connection.alias).get_or_create(pk=1)


class Migration(migrations.Migration):
    dependencies = [("organizations", "0004_create_default_organization_settings")]

    operations = [
        migrations.CreateModel(
            name="InstallationState",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
        ),
        migrations.RunPython(create_installation_state, migrations.RunPython.noop),
    ]

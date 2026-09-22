from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("organizations", "0011_backfill_personal_workspaces")]
    operations = [
        migrations.AddField(
            model_name="installationstate",
            name="allow_personal_workspaces",
            field=models.BooleanField(default=False),
        ),
    ]

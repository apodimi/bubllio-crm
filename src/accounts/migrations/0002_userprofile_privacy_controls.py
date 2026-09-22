from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="privacy_policy_version",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="privacy_policy_accepted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="marketing_consent",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="marketing_consent_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

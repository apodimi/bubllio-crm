import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Automation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("trigger", models.CharField(choices=[("organization.created", "Organization created"), ("organization.updated", "Organization updated"), ("company.created", "Company created"), ("company.updated", "Company updated"), ("company.lifecycle_stage_changed", "Company lifecycle stage changed"), ("contact.created", "Contact created"), ("contact.updated", "Contact updated")], max_length=100)),
                ("action_type", models.CharField(choices=[("send_email", "Send email")], max_length=50)),
                ("action_config", models.JSONField(blank=True, default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="automations", to="organizations.organization")),
            ],
        ),
        migrations.CreateModel(
            name="AutomationRun",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("trigger", models.CharField(max_length=100)),
                ("status", models.CharField(choices=[("success", "Success"), ("failed", "Failed"), ("skipped", "Skipped")], max_length=20)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("automation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="runs", to="automations.automation")),
            ],
        ),
    ]

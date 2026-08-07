import uuid

from django.db import models

from .events import AutomationTrigger


class Automation(models.Model):
    class ActionType(models.TextChoices):
        SEND_EMAIL = "send_email", "Send email"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="automations",
    )
    name = models.CharField(max_length=255)
    trigger = models.CharField(max_length=100, choices=AutomationTrigger.CHOICES)
    action_type = models.CharField(max_length=50, choices=ActionType.choices)
    action_config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class AutomationRun(models.Model):
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    automation = models.ForeignKey(
        Automation,
        on_delete=models.CASCADE,
        related_name="runs",
    )
    trigger = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices)
    payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.automation} - {self.status}"

import uuid

from django.db import models
from django.utils import timezone


class OutboxMessage(models.Model):
    class Kind(models.TextChoices):
        WORKSPACE_INVITATION = "workspace_invitation", "Workspace invitation"
        OWNER_INVITATION = "owner_invitation", "Owner invitation"
        INSTALLATION_ADMIN_INVITATION = (
            "installation_admin_invitation",
            "Installation administrator invitation",
        )
        PASSWORD_RESET = "password_reset", "Password reset"
        AUTOMATION_RUN = "automation_run", "Automation run"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        PROCESSING = "processing", "Processing"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=50, choices=Kind.choices)
    payload = models.JSONField(default=dict)
    encrypted_data = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    attempts = models.PositiveSmallIntegerField(default=0)
    available_at = models.DateTimeField(default=timezone.now)
    locked_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [models.Index(fields=("status", "available_at"))]

    def __str__(self):
        return f"{self.kind}: {self.status}"

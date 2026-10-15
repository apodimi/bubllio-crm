import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


class InstallationUpdateRun(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        PREFLIGHT = "preflight", "Preflight"
        BACKING_UP = "backing_up", "Backing up"
        DEPLOYING = "deploying", "Deploying"
        VERIFYING = "verifying", "Verifying"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        ROLLED_BACK = "rolled_back", "Rolled back"
        MANUAL_INTERVENTION = "manual_intervention", "Manual intervention"

    class MigrationPolicy(models.TextChoices):
        ONLINE_SAFE = "online_safe", "Online safe"
        MAINTENANCE = "maintenance", "Maintenance"
        IRREVERSIBLE = "irreversible", "Irreversible"

    ACTIVE_STATUSES = (
        Status.REQUESTED,
        Status.PREFLIGHT,
        Status.BACKING_UP,
        Status.DEPLOYING,
        Status.VERIFYING,
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deployment_key = models.CharField(max_length=32, default="installation", editable=False)
    target_version = models.CharField(max_length=32)
    idempotency_key = models.CharField(max_length=128, unique=True)
    agent_job_id = models.CharField(max_length=128, unique=True, null=True, blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installation_update_runs",
    )
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.REQUESTED)
    progress = models.PositiveSmallIntegerField(
        default=0,
        validators=(MinValueValidator(0), MaxValueValidator(100)),
    )
    phase_label = models.CharField(max_length=120, blank=True)
    migration_policy = models.CharField(max_length=20, choices=MigrationPolicy.choices, blank=True)
    failure_code = models.CharField(max_length=64, blank=True)
    failure_message = models.CharField(max_length=240, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-requested_at",)
        constraints = (
            models.UniqueConstraint(
                fields=("deployment_key",),
                condition=Q(status__in=("requested", "preflight", "backing_up", "deploying", "verifying")),
                name="one_active_installation_update",
            ),
        )


class InstallationUpdateEvent(models.Model):
    id = models.BigAutoField(primary_key=True)
    run = models.ForeignKey(InstallationUpdateRun, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installation_update_events",
    )
    action = models.CharField(max_length=64)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at", "pk")
        indexes = (models.Index(fields=("run", "created_at"), name="onboard_upd_run_created_idx"),)

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Task(models.Model):
    class WorkflowStatus(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        WAITING = "waiting", "Waiting"
        COMPLETED = "completed", "Completed"

    class Kind(models.TextChoices):
        TASK = "task", "Task"
        CALL = "call", "Call"
        EMAIL = "email", "Email"
        MEETING = "meeting", "Meeting"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="tasks"
    )
    company = models.ForeignKey(
        "companies.Company", on_delete=models.PROTECT, related_name="tasks"
    )
    contact = models.ForeignKey(
        "contacts.Contact", blank=True, null=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    deal = models.ForeignKey(
        "deals.Deal", blank=True, null=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="assigned_crm_tasks",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="created_crm_tasks",
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="completed_crm_tasks",
    )
    title = models.CharField(max_length=255)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.TASK)
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.NORMAL
    )
    workflow_status = models.CharField(
        max_length=20, choices=WorkflowStatus.choices, default=WorkflowStatus.TODO
    )
    due_at = models.DateTimeField()
    reminder_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("completed_at", "due_at", "-priority", "created_at")
        indexes = [
            models.Index(
                fields=("organization", "completed_at", "due_at"),
                name="task_org_open_due_idx",
            ),
            models.Index(
                fields=("organization", "assigned_to", "due_at"),
                name="task_org_owner_due_idx",
            ),
            models.Index(fields=("organization", "deal"), name="task_org_deal_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(
                        workflow_status="completed",
                        completed_at__isnull=False,
                    )
                    | models.Q(
                        ~models.Q(workflow_status="completed"),
                        completed_at__isnull=True,
                    )
                ),
                name="task_completion_matches_workflow",
            )
        ]

    @property
    def effective_status(self):
        if self.workflow_status == self.WorkflowStatus.COMPLETED:
            return "completed"
        return "overdue" if self.due_at < timezone.now() else "open"

    def __str__(self):
        return self.title

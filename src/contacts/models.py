import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Contact(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        FORMER = "former", "Former"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL,
        related_name="assigned_contacts",
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=150, blank=True)
    job_title = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("first_name", "last_name", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("company",), condition=Q(is_primary=True, archived_at__isnull=True),
                name="unique_active_primary_contact_per_company",
            )
        ]

    def __str__(self):
        if self.last_name:
            return f"{self.first_name} {self.last_name}"

        return self.first_name


class ContactActivity(models.Model):
    class Action(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        ASSIGNED = "assigned", "Assigned"
        ARCHIVED = "archived", "Archived"
        RESTORED = "restored", "Restored"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="contact_activities")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL, related_name="contact_activities")
    action = models.CharField(max_length=32, choices=Action.choices)
    details = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [models.Index(fields=("contact", "created_at"))]

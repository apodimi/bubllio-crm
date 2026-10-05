import uuid

from django.conf import settings
from django.db import models


class Company(models.Model):
    class LifecycleStage(models.TextChoices):
        LEAD = "lead", "Lead"
        PROSPECT = "prospect", "Prospect"
        CUSTOMER = "customer", "Customer"
        INACTIVE = "inactive", "Inactive"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="companies",
    )
    customer_code = models.CharField(max_length=24)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="assigned_companies",
    )
    name = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=64, blank=True)
    industry = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=32, blank=True)
    country = models.CharField(max_length=2, blank=True)
    notes = models.TextField(blank=True)
    lifecycle_stage = models.CharField(
        max_length=20,
        choices=LifecycleStage.choices,
        default=LifecycleStage.LEAD,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("name", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "customer_code"),
                name="unique_company_customer_code_per_organization",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.customer_code and self.organization_id:
            codes = type(self).objects.filter(
                organization_id=self.organization_id,
                customer_code__startswith="CUS-",
            ).values_list("customer_code", flat=True)
            numbers = [
                int(code.removeprefix("CUS-"))
                for code in codes
                if code.removeprefix("CUS-").isdigit()
            ]
            self.customer_code = f"CUS-{max(numbers, default=0) + 1:05d}"
        super().save(*args, **kwargs)


class CompanyActivity(models.Model):
    class Action(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        ASSIGNED = "assigned", "Assigned"
        CONTACT_ADDED = "contact_added", "Contact added"
        ARCHIVED = "archived", "Archived"
        RESTORED = "restored", "Restored"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="company_activities",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="company_activities",
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    details = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [models.Index(fields=("company", "created_at"))]

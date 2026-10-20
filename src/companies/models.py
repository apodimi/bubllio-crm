import uuid

from django.conf import settings
from django.db import models, router, transaction
from django.db.models.functions import Lower
from django.utils import timezone


class CustomerCodeCounter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField("organizations.Organization", on_delete=models.CASCADE)
    last_number = models.PositiveBigIntegerField(default=0)


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
        indexes = [
            models.Index(fields=("organization", "name", "id"), name="company_org_name_idx"),
            models.Index(fields=("organization", "archived_at", "name", "id"), name="company_org_active_name_idx"),
        ]
        constraints = [
            models.UniqueConstraint(Lower("email"), models.F("organization"), condition=~models.Q(email=""), name="company_org_email_ci_unique"),
            models.UniqueConstraint(Lower("tax_id"), models.F("organization"), condition=~models.Q(tax_id=""), name="company_org_tax_ci_unique"),
            models.UniqueConstraint(
                fields=("organization", "customer_code"),
                name="unique_company_customer_code_per_organization",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        using = kwargs.get("using") or router.db_for_write(type(self), instance=self)
        with transaction.atomic(using=using):
            if self.organization_id:
                counters = CustomerCodeCounter.objects.using(using)
                counter, _ = counters.get_or_create(organization_id=self.organization_id)
                if not self.customer_code:
                    # An atomic increment locks the counter until the company is
                    # saved; no scan and no reuse after deleting a customer.
                    counters.filter(pk=counter.pk).update(last_number=models.F("last_number") + 1)
                    counter.refresh_from_db(using=using)
                    self.customer_code = f"CUS-{counter.last_number:05d}"
                elif self.customer_code.startswith("CUS-") and self.customer_code[4:].isascii() and self.customer_code[4:].isdigit():
                    number = int(self.customer_code[4:])
                    if number > 9223372036854775806:
                        raise ValueError("Customer code exceeds the supported counter range.")
                    counters.filter(pk=counter.pk, last_number__lt=number).update(last_number=number)
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


class CompanyTimelineEvent(models.Model):
    class Category(models.TextChoices):
        COMPANY = "company", "Company"
        CONTACT = "contact", "Contact"
        DEAL = "deal", "Deal"
        TASK = "task", "Task"
        SERVICE = "service", "Service"
        PAYMENT = "payment", "Payment"
        NOTE = "note", "Note"
        COMMUNICATION = "communication", "Communication"

    class EventType(models.TextChoices):
        COMPANY_CREATED = "company.created", "Company created"
        COMPANY_UPDATED = "company.updated", "Company updated"
        COMPANY_ASSIGNED = "company.assigned", "Company assigned"
        COMPANY_ARCHIVED = "company.archived", "Company archived"
        COMPANY_RESTORED = "company.restored", "Company restored"
        CONTACT_CREATED = "contact.created", "Contact created"
        CONTACT_UPDATED = "contact.updated", "Contact updated"
        CONTACT_ASSIGNED = "contact.assigned", "Contact assigned"
        CONTACT_ARCHIVED = "contact.archived", "Contact archived"
        CONTACT_RESTORED = "contact.restored", "Contact restored"
        DEAL_CREATED = "deal.created", "Deal created"
        DEAL_UPDATED = "deal.updated", "Deal updated"
        DEAL_STAGE_CHANGED = "deal.stage_changed", "Deal stage changed"
        DEAL_ARCHIVED = "deal.archived", "Deal archived"
        DEAL_RESTORED = "deal.restored", "Deal restored"
        TASK_CREATED = "task.created", "Task created"
        TASK_UPDATED = "task.updated", "Task updated"
        TASK_STATUS_CHANGED = "task.status_changed", "Task status changed"
        TASK_COMPLETED = "task.completed", "Task completed"
        TASK_REOPENED = "task.reopened", "Task reopened"
        SERVICE_CREATED = "service.created", "Service created"
        SERVICE_UPDATED = "service.updated", "Service updated"
        SERVICE_STATUS_CHANGED = "service.status_changed", "Service status changed"
        PAYMENT_RECORDED = "payment.recorded", "Payment recorded"
        NOTE_ADDED = "note.added", "Note added"
        COMMUNICATION_LOGGED = "communication.logged", "Communication logged"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="company_timeline_events",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="timeline_events",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="company_timeline_events",
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    event_type = models.CharField(max_length=64, choices=EventType.choices)
    source_type = models.CharField(max_length=32, blank=True)
    source_id = models.UUIDField(blank=True, null=True)
    body = models.TextField(blank=True)
    details = models.JSONField(blank=True, default=dict)
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-occurred_at", "-id")
        indexes = [
            models.Index(
                fields=("company", "-occurred_at", "-id"),
                name="company_timeline_order_idx",
            ),
            models.Index(
                fields=("company", "category", "-occurred_at"),
                name="company_timeline_filter_idx",
            ),
        ]

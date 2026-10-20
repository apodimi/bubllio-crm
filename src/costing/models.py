import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db import models


class ExternalCollaborator(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="external_collaborators",
    )
    name = models.CharField(max_length=255)
    specialty = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name", "id")
        indexes = [
            models.Index(
                fields=("organization", "is_active", "name"),
                name="cost_collab_org_active_idx",
            )
        ]

    def __str__(self):
        return self.name


class CollaboratorService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="collaborator_services",
    )
    collaborator = models.ForeignKey(
        ExternalCollaborator,
        on_delete=models.PROTECT,
        related_name="services",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    default_cost = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="EUR")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("collaborator__name", "name", "id")
        indexes = [
            models.Index(
                fields=("organization", "is_active", "name"),
                name="cost_service_org_active_idx",
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(default_cost__gte=0),
                name="cost_service_amount_nonnegative",
            )
        ]

    def save(self, *args, **kwargs):
        self.currency = self.currency.upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.collaborator}: {self.name}"


class DealCostLine(models.Model):
    class Status(models.TextChoices):
        ESTIMATED = "estimated", "Estimated"
        COMMITTED = "committed", "Committed"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="deal_cost_lines",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        related_name="cost_lines",
    )
    collaborator = models.ForeignKey(
        ExternalCollaborator,
        on_delete=models.PROTECT,
        related_name="deal_cost_lines",
    )
    collaborator_service = models.ForeignKey(
        CollaboratorService,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="deal_cost_lines",
    )
    collaborator_name = models.CharField(max_length=255)
    service_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ESTIMATED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at", "id")
        indexes = [
            models.Index(
                fields=("organization", "deal", "status"),
                name="cost_line_org_deal_idx",
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="cost_line_quantity_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(unit_cost__gte=0),
                name="cost_line_amount_nonnegative",
            ),
        ]

    @property
    def total_cost(self):
        return (self.quantity * self.unit_cost).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

    def save(self, *args, **kwargs):
        self.currency = self.currency.upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.deal}: {self.service_name}"


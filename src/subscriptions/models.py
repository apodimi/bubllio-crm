import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models
from django.utils import timezone


class ServiceCatalogItem(models.Model):
    class BillingInterval(models.TextChoices):
        ONE_OFF = "one_off", "One-off"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        SEMIANNUAL = "semiannual", "Every six months"
        ANNUAL = "annual", "Annual"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="service_catalog_items")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    internal_code = models.CharField(max_length=50, blank=True)
    default_net_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="EUR")
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=24)
    billing_interval = models.CharField(max_length=20, choices=BillingInterval.choices, default=BillingInterval.MONTHLY)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "internal_code"), condition=~models.Q(internal_code=""), name="unique_service_code_per_organization"),
            models.CheckConstraint(condition=models.Q(default_tax_rate__gte=0, default_tax_rate__lte=100), name="catalog_tax_rate_between_0_and_100"),
            models.CheckConstraint(condition=models.Q(default_net_price__gte=0), name="catalog_net_price_not_negative"),
        ]

    def __str__(self):
        return self.name


class CustomerSubscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        CANCELLING = "cancelling", "Cancelling"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="customer_subscriptions")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, related_name="subscriptions")
    catalog_item = models.ForeignKey(ServiceCatalogItem, blank=True, null=True, on_delete=models.PROTECT, related_name="subscriptions")
    originating_deal = models.ForeignKey("deals.Deal", blank=True, null=True, on_delete=models.SET_NULL, related_name="subscriptions")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL, related_name="assigned_subscriptions")
    name = models.CharField(max_length=255)
    net_price = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="EUR")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=24)
    billing_interval = models.CharField(max_length=20, choices=ServiceCatalogItem.BillingInterval.choices)
    start_date = models.DateField()
    next_billing_date = models.DateField()
    renewal_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    cancellation_effective_date = models.DateField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    auto_renew = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    operational_reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("next_billing_date", "name")
        constraints = [
            models.CheckConstraint(condition=models.Q(tax_rate__gte=0, tax_rate__lte=100), name="subscription_tax_rate_between_0_and_100"),
            models.CheckConstraint(condition=models.Q(net_price__gte=0), name="subscription_net_price_not_negative"),
            models.CheckConstraint(condition=models.Q(end_date__isnull=True) | models.Q(end_date__gte=models.F("start_date")), name="subscription_end_not_before_start"),
        ]

    @property
    def tax_amount(self):
        return (self.net_price * self.tax_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def gross_price(self):
        return self.net_price + self.tax_amount

    @property
    def effective_status(self):
        today = timezone.localdate()
        if (
            self.end_date
            and self.end_date < today
            and self.status
            in {self.Status.ACTIVE, self.Status.PAUSED, self.Status.CANCELLING}
        ):
            return self.Status.EXPIRED
        if (
            self.status == self.Status.CANCELLING
            and self.cancellation_effective_date
            and self.cancellation_effective_date < today
        ):
            return self.Status.CANCELLED
        return self.status

    def __str__(self):
        return f"{self.company}: {self.name}"


class Charge(models.Model):
    class State(models.TextChoices):
        OPEN = "open", "Open"
        WAIVED = "waived", "Waived"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="charges")
    subscription = models.ForeignKey(CustomerSubscription, on_delete=models.PROTECT, related_name="charges")
    coverage_start = models.DateField()
    coverage_end = models.DateField()
    due_date = models.DateField()
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2)
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3)
    state = models.CharField(max_length=20, choices=State.choices, default=State.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("due_date", "created_at")
        constraints = [
            models.UniqueConstraint(fields=("subscription", "due_date"), name="unique_charge_due_date_per_subscription"),
            models.CheckConstraint(condition=models.Q(net_amount__gte=0, tax_amount__gte=0, gross_amount__gte=0), name="charge_amounts_not_negative"),
            models.CheckConstraint(condition=models.Q(tax_rate__gte=0, tax_rate__lte=100), name="charge_tax_rate_between_0_and_100"),
            models.CheckConstraint(condition=models.Q(coverage_end__gte=models.F("coverage_start")), name="charge_coverage_dates_in_order"),
        ]

    @property
    def paid_amount(self):
        return self.payments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")

    @property
    def outstanding_amount(self):
        return max(self.gross_amount - self.paid_amount, Decimal("0.00"))

    @property
    def payment_status(self):
        if self.state != self.State.OPEN:
            return self.state
        if self.outstanding_amount == 0:
            return "paid"
        if self.paid_amount > 0:
            return "partially_paid"
        return "overdue" if self.due_date < timezone.localdate() else "due" if self.due_date == timezone.localdate() else "upcoming"


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="payments")
    charge = models.ForeignKey(Charge, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    paid_date = models.DateField(default=timezone.localdate)
    payment_method = models.CharField(max_length=50, blank=True)
    external_reference = models.CharField(max_length=255, blank=True)
    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL, related_name="recorded_payments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-paid_date", "-created_at")
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name="payment_amount_positive")
        ]

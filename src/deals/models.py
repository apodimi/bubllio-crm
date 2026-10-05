import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models


class Deal(models.Model):
    class Stage(models.TextChoices):
        LEAD = "lead", "Lead"
        QUALIFIED = "qualified", "Qualified"
        PROPOSAL = "proposal", "Proposal"
        NEGOTIATION = "negotiation", "Negotiation"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="deals")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, related_name="deals")
    contact = models.ForeignKey("contacts.Contact", blank=True, null=True, on_delete=models.SET_NULL, related_name="deals")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL, related_name="assigned_deals")
    title = models.CharField(max_length=255)
    value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="EUR")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=24)
    amount_includes_tax = models.BooleanField(default=False)
    probability = models.PositiveSmallIntegerField(default=10)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.LEAD)
    sort_order = models.PositiveIntegerField(default=0)
    expected_close_date = models.DateField(blank=True, null=True)
    lost_reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    archived_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("stage", "sort_order", "created_at")
        constraints = [
            models.CheckConstraint(condition=models.Q(probability__gte=0, probability__lte=100), name="deal_probability_between_0_and_100"),
            models.CheckConstraint(condition=models.Q(tax_rate__gte=0, tax_rate__lte=100), name="deal_tax_rate_between_0_and_100"),
        ]

    @property
    def net_value(self):
        if not self.amount_includes_tax:
            return self.value
        divisor = Decimal("1") + self.tax_rate / Decimal("100")
        return (self.value / divisor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def tax_value(self):
        if self.amount_includes_tax:
            return self.value - self.net_value
        return (self.value * self.tax_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def gross_value(self):
        return self.value if self.amount_includes_tax else self.value + self.tax_value

    def __str__(self):
        return self.title

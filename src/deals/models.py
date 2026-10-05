import uuid
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
    probability = models.PositiveSmallIntegerField(default=10)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.LEAD)
    expected_close_date = models.DateField(blank=True, null=True)
    lost_reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    archived_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("expected_close_date", "-created_at")
        constraints = [models.CheckConstraint(condition=models.Q(probability__gte=0, probability__lte=100), name="deal_probability_between_0_and_100")]

    def __str__(self):
        return self.title

from rest_framework import serializers
from organizations.models import OrganizationMembership
from .models import Deal


class DealSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    net_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    tax_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    gross_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    def get_contact_name(self, deal) -> str | None:
        return str(deal.contact) if deal.contact else ""

    def get_assigned_to_name(self, deal) -> str | None:
        return (deal.assigned_to.get_full_name() or deal.assigned_to.username) if deal.assigned_to else ""

    def validate(self, attrs):
        organization = self.context.get("organization") or getattr(self.instance, "organization", None)
        company = attrs.get("company", getattr(self.instance, "company", None))
        contact = attrs.get("contact", getattr(self.instance, "contact", None))
        owner = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if company and company.organization_id != organization.id:
            raise serializers.ValidationError({"company": "Choose a company from this workspace."})
        if contact and (contact.organization_id != organization.id or contact.company_id != company.id):
            raise serializers.ValidationError({"contact": "Choose a contact from the selected company."})
        if owner and not OrganizationMembership.objects.filter(organization=organization, user=owner).exists():
            raise serializers.ValidationError({"assigned_to": "Choose a member of this workspace."})
        tax_rate = attrs.get("tax_rate", getattr(self.instance, "tax_rate", 24))
        if tax_rate < 0 or tax_rate > 100:
            raise serializers.ValidationError({"tax_rate": "Enter a VAT rate between 0 and 100."})
        stage = attrs.get("stage", getattr(self.instance, "stage", Deal.Stage.LEAD))
        reason = attrs.get("lost_reason", getattr(self.instance, "lost_reason", ""))
        if stage == Deal.Stage.LOST and not reason.strip():
            raise serializers.ValidationError({"lost_reason": "Add a reason when a deal is lost."})
        return attrs

    class Meta:
        model = Deal
        fields = ("id", "organization", "company", "company_name", "contact", "contact_name", "assigned_to", "assigned_to_name", "title", "value", "currency", "tax_rate", "amount_includes_tax", "net_value", "tax_value", "gross_value", "probability", "stage", "sort_order", "expected_close_date", "lost_reason", "notes", "archived_at", "created_at", "updated_at")
        read_only_fields = ("id", "organization", "company_name", "contact_name", "assigned_to_name", "net_value", "tax_value", "gross_value", "sort_order", "archived_at", "created_at", "updated_at")

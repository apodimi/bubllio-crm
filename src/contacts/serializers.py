from rest_framework import serializers
from django.db import transaction

from organizations.models import OrganizationMembership

from .models import Contact, ContactActivity


class ContactSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    def get_assigned_to_name(self, contact) -> str | None:
        if not contact.assigned_to:
            return ""
        return contact.assigned_to.get_full_name() or contact.assigned_to.username

    class Meta:
        model = Contact
        fields = [
            "id",
            "organization",
            "company",
            "company_name",
            "assigned_to",
            "assigned_to_name",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "department",
            "job_title",
            "status",
            "is_primary",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = ("id", "organization", "assigned_to_name", "created_at", "updated_at", "archived_at")

    def validate(self, attrs):
        organization = self.context.get("organization") or getattr(
            self.instance, "organization", None
        )
        company = attrs.get("company", getattr(self.instance, "company", None))

        if organization and company and company.organization_id != organization.id:
            raise serializers.ValidationError(
                {"company": "Company must belong to the selected organization."}
            )

        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if assigned_to and not OrganizationMembership.objects.filter(organization=organization, user=assigned_to).exists():
            raise serializers.ValidationError({"assigned_to": "Choose a member of this workspace."})

        email = attrs.get("email", getattr(self.instance, "email", "")).strip()
        if organization and email:
            contacts = Contact.objects.filter(organization=organization, email__iexact=email)
            if self.instance:
                contacts = contacts.exclude(pk=self.instance.pk)
            if contacts.exists():
                raise serializers.ValidationError(
                    {"email": "A contact with this email already exists."}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        if validated_data.get("is_primary"):
            Contact.objects.filter(company=validated_data["company"], is_primary=True).update(is_primary=False)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        if validated_data.get("is_primary"):
            company = validated_data.get("company", instance.company)
            Contact.objects.filter(company=company, is_primary=True).exclude(pk=instance.pk).update(is_primary=False)
        return super().update(instance, validated_data)


class ContactActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    def get_actor_name(self, activity) -> str | None:
        return (activity.actor.get_full_name() or activity.actor.username) if activity.actor else "System"

    class Meta:
        model = ContactActivity
        fields = ("id", "action", "actor_name", "details", "created_at")

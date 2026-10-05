from rest_framework import serializers

from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Contact
        fields = [
            "id",
            "organization",
            "company",
            "company_name",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "department",
            "job_title",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "organization", "created_at", "updated_at")

    def validate(self, attrs):
        organization = self.context.get("organization") or getattr(
            self.instance, "organization", None
        )
        company = attrs.get("company", getattr(self.instance, "company", None))

        if organization and company and company.organization_id != organization.id:
            raise serializers.ValidationError(
                {"company": "Company must belong to the selected organization."}
            )

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

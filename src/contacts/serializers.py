from rest_framework import serializers

from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id",
            "organization",
            "company",
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
        organization = self.context.get("organization")
        company = attrs.get("company")

        if organization and company and company.organization_id != organization.id:
            raise serializers.ValidationError(
                {"company": "Company must belong to the selected organization."}
            )

        return attrs

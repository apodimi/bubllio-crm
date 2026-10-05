from rest_framework import serializers

from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    def validate_country(self, value):
        value = value.strip().upper()
        if value and (len(value) != 2 or not value.isalpha()):
            raise serializers.ValidationError("Use a two-letter country code.")
        return value

    class Meta:
        model = Company
        fields = [
            "id",
            "organization",
            "name",
            "tax_id",
            "industry",
            "email",
            "phone_number",
            "website",
            "address_line_1",
            "address_line_2",
            "city",
            "postal_code",
            "country",
            "notes",
            "lifecycle_stage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "organization", "created_at", "updated_at")

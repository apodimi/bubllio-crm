from rest_framework import serializers

from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id",
            "organization",
            "name",
            "email",
            "phone_number",
            "website",
            "lifecycle_stage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "organization", "created_at", "updated_at")

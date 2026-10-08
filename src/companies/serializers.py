from rest_framework import serializers

from organizations.models import OrganizationMembership

from .models import Company, CompanyActivity


class CompanySerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()

    def get_assigned_to_name(self, company) -> str | None:
        if not company.assigned_to:
            return ""
        return company.assigned_to.get_full_name() or company.assigned_to.username

    def validate_country(self, value):
        value = value.strip().upper()
        if value and (len(value) != 2 or not value.isalpha()):
            raise serializers.ValidationError("Use a two-letter country code.")
        return value

    def validate(self, attrs):
        organization = self.context.get("organization") or getattr(
            self.instance, "organization", None
        )
        if not organization:
            return attrs

        assigned_to = attrs.get("assigned_to")
        if assigned_to and not OrganizationMembership.objects.filter(
            organization=organization,
            user=assigned_to,
        ).exists():
            raise serializers.ValidationError(
                {"assigned_to": "Choose a member of this workspace."}
            )

        companies = Company.objects.filter(organization=organization)
        if self.instance:
            companies = companies.exclude(pk=self.instance.pk)

        tax_id = attrs.get("tax_id", getattr(self.instance, "tax_id", "")).strip()
        if tax_id and companies.filter(tax_id__iexact=tax_id).exists():
            raise serializers.ValidationError(
                {"tax_id": "A company with this Tax / VAT ID already exists."}
            )

        email = attrs.get("email", getattr(self.instance, "email", "")).strip()
        if email and companies.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "A company with this email already exists."}
            )
        return attrs

    class Meta:
        model = Company
        fields = [
            "id",
            "organization",
            "customer_code",
            "assigned_to",
            "assigned_to_name",
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
            "archived_at",
        ]
        read_only_fields = (
            "id",
            "organization",
            "customer_code",
            "assigned_to_name",
            "created_at",
            "updated_at",
            "archived_at",
        )


class CompanyActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    def get_actor_name(self, activity) -> str | None:
        if not activity.actor:
            return "System"
        return activity.actor.get_full_name() or activity.actor.username

    class Meta:
        model = CompanyActivity
        fields = ("id", "action", "actor_name", "details", "created_at")


class CompanyAssigneeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user_id")
    name = serializers.SerializerMethodField()

    def get_name(self, membership) -> str:
        return membership.user.get_full_name() or membership.user.username

    class Meta:
        model = OrganizationMembership
        fields = ("id", "name", "role")

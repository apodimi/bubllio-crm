from rest_framework import serializers

from .services.email_security import encrypt_secret
from .choices import locale_choices, timezone_choices
from .models import EmailAccount, Organization, OrganizationMembership, OrganizationSettings


class OrganizationSerializer(serializers.ModelSerializer):
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "is_personal",
            "current_user_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "is_personal", "created_at", "updated_at")

    def get_current_user_role(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        membership = obj.memberships.filter(user=request.user).only("role").first()
        return membership.role if membership else None


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user = serializers.IntegerField(source="user_id", read_only=True)
    username = serializers.CharField(source="user.get_username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "user",
            "username",
            "email",
            "role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "role", "created_at", "updated_at")


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    timezone = serializers.ChoiceField(choices=timezone_choices())
    locale = serializers.ChoiceField(choices=locale_choices())

    def validate_currency(self, value):
        value = value.strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Use a three-letter currency code such as EUR.")
        return value

    def validate_country(self, value):
        value = value.strip().upper()
        if value and (len(value) != 2 or not value.isalpha()):
            raise serializers.ValidationError("Use a two-letter country code such as GR.")
        return value

    def validate_fiscal_year_start_month(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Choose a month from 1 to 12.")
        return value

    def validate_default_tax_rate(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Tax rate must be between 0 and 100.")
        return value

    def validate_next_document_number(self, value):
        if value < 1:
            raise serializers.ValidationError("Next document number must be at least 1.")
        return value

    class Meta:
        model = OrganizationSettings
        fields = [
            "organization",
            "timezone",
            "locale",
            "default_from_name",
            "legal_name", "trading_name", "tax_id", "tax_office",
            "registration_number", "business_email", "phone", "website",
            "address_line_1", "address_line_2", "city", "postal_code", "country",
            "currency", "fiscal_year_start_month", "default_tax_rate",
            "default_payment_terms_days", "document_prefix", "next_document_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("organization", "created_at", "updated_at")


class EmailAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = EmailAccount
        fields = [
            "id",
            "name",
            "provider",
            "host",
            "port",
            "username",
            "password",
            "use_tls",
            "use_ssl",
            "from_email",
            "from_name",
            "is_default",
            "is_active",
            "last_tested_at",
            "last_test_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = (
            "id",
            "last_tested_at",
            "last_test_error",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        use_tls = attrs.get("use_tls", self.instance.use_tls if self.instance else True)
        use_ssl = attrs.get("use_ssl", self.instance.use_ssl if self.instance else False)
        if use_tls and use_ssl:
            raise serializers.ValidationError(
                "use_tls and use_ssl cannot both be enabled."
            )
        provider = attrs.get(
            "provider",
            self.instance.provider if self.instance else EmailAccount.Provider.SMTP,
        )
        if provider != EmailAccount.Provider.SMTP:
            raise serializers.ValidationError({"provider": "Only SMTP is supported currently."})
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "This field is required."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return EmailAccount.objects.create(
            organization=self.context["organization"],
            encrypted_password=encrypt_secret(password),
            **validated_data,
        )

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password:
            instance.encrypted_password = encrypt_secret(password)
        return super().update(instance, validated_data)

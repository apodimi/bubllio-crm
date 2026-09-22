from django.contrib.auth import get_user_model
from rest_framework import serializers

from .email_security import encrypt_secret
from .choices import locale_choices, timezone_choices
from .models import EmailAccount, Organization, OrganizationMembership, OrganizationSettings


User = get_user_model()


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
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.all(),
        write_only=True,
    )
    username = serializers.CharField(source="user.get_username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "user",
            "user_id",
            "username",
            "email",
            "role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_role(self, value):
        if value == OrganizationMembership.Role.OWNER:
            raise serializers.ValidationError(
                "Use the membership detail endpoint to transfer ownership."
            )
        return value

    def validate(self, attrs):
        organization = self.context["organization"]
        user = attrs.get("user")
        if user and OrganizationMembership.objects.filter(
            organization=organization,
            user=user,
        ).exists():
            raise serializers.ValidationError(
                {"user_id": "This user is already a member of the organization."}
            )
        return attrs

    def create(self, validated_data):
        return OrganizationMembership.objects.create(
            organization=self.context["organization"],
            **validated_data,
        )


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    timezone = serializers.ChoiceField(choices=timezone_choices())
    locale = serializers.ChoiceField(choices=locale_choices())

    class Meta:
        model = OrganizationSettings
        fields = [
            "organization",
            "timezone",
            "locale",
            "default_from_name",
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

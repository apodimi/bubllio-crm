from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from organizations.models import OrganizationInvitation, OrganizationMembership


class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            OrganizationMembership.Role.ADMIN,
            OrganizationMembership.Role.MEMBER,
            OrganizationMembership.Role.VIEWER,
        ]
    )

    def validate_email(self, value):
        return value.strip().lower()


class InvitationRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    display_name = serializers.CharField(max_length=255, required=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    timezone = serializers.CharField(max_length=64, default="UTC")
    locale = serializers.CharField(max_length=20, default="en-us")

    def validate_username(self, value):
        if get_user_model().objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate(self, attrs):
        candidate = get_user_model()(
            username=attrs["username"], email=self.context["invited_email"]
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages}) from error
        return attrs


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
        choices=OrganizationInvitation.Status.choices,
        read_only=True,
    )
    invited_by = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationInvitation
        fields = (
            "id",
            "email",
            "role",
            "status",
            "invited_by",
            "created_at",
            "expires_at",
            "accepted_at",
            "revoked_at",
        )

    def get_invited_by(self, invitation) -> str | None:
        return invitation.invited_by.username if invitation.invited_by else None


class InvitationDetailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    organization_name = serializers.CharField()
    role = serializers.CharField()
    expires_at = serializers.DateTimeField()


class InvitationAcceptanceSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    role = serializers.CharField()
    membership_created = serializers.BooleanField()
    tokens = serializers.DictField(allow_null=True)

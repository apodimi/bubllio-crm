from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .serializers import EmailAccountSerializer


class InstallationSetupSerializer(serializers.Serializer):
    setup_token = serializers.CharField(write_only=True, trim_whitespace=False)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    organization_name = serializers.CharField(max_length=255)
    organization_slug = serializers.SlugField(max_length=255)
    smtp = EmailAccountSerializer(required=False)

    def validate_username(self, value):
        user_model = get_user_model()
        username_field = user_model._meta.get_field(user_model.USERNAME_FIELD)
        if len(value) > username_field.max_length:
            raise serializers.ValidationError("Username is too long.")
        return value

    def validate(self, attrs):
        user_model = get_user_model()
        candidate = user_model(username=attrs["username"], email=attrs["email"])
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except ValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs


class InstallationSmtpTestSerializer(serializers.Serializer):
    setup_token = serializers.CharField(write_only=True, trim_whitespace=False)
    recipient = serializers.EmailField()
    smtp = EmailAccountSerializer()

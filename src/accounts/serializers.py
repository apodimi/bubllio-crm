from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "username", "email", "display_name", "first_name", "last_name",
            "date_of_birth", "timezone", "locale", "onboarding_completed_at",
        ]
        read_only_fields = ("username", "email", "onboarding_completed_at")

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.onboarding_completed_at = timezone.now()
        instance.save()
        return instance


class AccountSettingsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField()
    display_name = serializers.CharField(source="profile.display_name", required=False, allow_blank=True)
    first_name = serializers.CharField(source="profile.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="profile.last_name", required=False, allow_blank=True)
    date_of_birth = serializers.DateField(source="profile.date_of_birth", required=False, allow_null=True)
    timezone = serializers.CharField(source="profile.timezone", required=False)
    locale = serializers.CharField(source="profile.locale", required=False)

    class Meta:
        model = User
        fields = [
            "username", "email", "display_name", "first_name", "last_name",
            "date_of_birth", "timezone", "locale",
        ]
        read_only_fields = ("username",)

    def validate_email(self, value):
        user = self.instance
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email address is already in use.")
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save(update_fields=("email",))
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.onboarding_completed_at = timezone.now()
        profile.save()
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context["user"].check_password(value):
            raise serializers.ValidationError("The current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value, user=self.context["user"])
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

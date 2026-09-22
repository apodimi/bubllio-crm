from django.utils import timezone
from rest_framework import serializers

from .models import UserProfile


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

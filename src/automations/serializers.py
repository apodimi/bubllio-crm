from rest_framework import serializers

from .models import Automation, AutomationRun


class SendEmailActionConfigSerializer(serializers.Serializer):
    to = serializers.ListField(
        child=serializers.EmailField(),
        allow_empty=False,
    )
    subject = serializers.CharField(allow_blank=False)
    body = serializers.CharField(allow_blank=False)
    from_email = serializers.EmailField(required=False, allow_blank=True)


class AutomationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Automation
        fields = [
            "id",
            "organization",
            "name",
            "trigger",
            "action_type",
            "action_config",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "organization", "created_at", "updated_at")

    def validate_action_config(self, value):
        action_type = self.initial_data.get("action_type")

        if action_type == Automation.ActionType.SEND_EMAIL:
            serializer = SendEmailActionConfigSerializer(data=value)
            serializer.is_valid(raise_exception=True)
            return serializer.validated_data

        return value


class AutomationRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRun
        fields = [
            "id",
            "automation",
            "trigger",
            "status",
            "payload",
            "error_message",
            "created_at",
        ]

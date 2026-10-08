"""Explicit serializers for operational API responses.

These serializers document dictionary responses that are assembled by services
and are not backed by Django models.
"""

from rest_framework import serializers

from organizations.serializers import EmailAccountSerializer


class UpdateStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    enabled = serializers.BooleanField()
    current_version = serializers.CharField()
    latest_version = serializers.CharField(allow_null=True)
    update_available = serializers.BooleanField()
    release_name = serializers.CharField(allow_null=True)
    release_url = serializers.URLField(allow_null=True)
    published_at = serializers.DateTimeField(allow_null=True)


class ReadinessCheckSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    meaning = serializers.CharField()
    status = serializers.ChoiceField(choices=("pass", "fail"))
    guidance = serializers.CharField()


class ProductionReadinessSerializer(serializers.Serializer):
    ready = serializers.BooleanField()
    passed = serializers.IntegerField()
    total = serializers.IntegerField()
    checks = ReadinessCheckSerializer(many=True)


class SystemInformationSerializer(serializers.Serializer):
    application_version = serializers.CharField()
    python_version = serializers.CharField()
    django_version = serializers.CharField()
    database = serializers.CharField()
    email_delivery = serializers.CharField()
    debug_enabled = serializers.BooleanField()
    update_check_enabled = serializers.BooleanField()
    public_url = serializers.CharField()
    runtime = serializers.CharField()


class AuditEventSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    action = serializers.CharField()
    actor = serializers.CharField()
    target = serializers.CharField(allow_null=True)
    organization_id = serializers.UUIDField(required=False, allow_null=True)
    details = serializers.DictField()
    created_at = serializers.DateTimeField()


class BackupCheckSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("unknown", "failed", "stale", "current"))
    completed_at = serializers.DateTimeField(allow_null=True)


class BackupStatusSerializer(serializers.Serializer):
    backup = BackupCheckSerializer()
    restore_test = BackupCheckSerializer()
    backup_max_age_hours = serializers.IntegerField()
    restore_test_max_age_days = serializers.IntegerField()


class DataExportSerializer(serializers.Serializer):
    format = serializers.CharField()
    format_version = serializers.IntegerField()
    generated_at = serializers.DateTimeField()
    workspaces = serializers.ListField(child=serializers.DictField())


class InstallationSettingsSerializer(serializers.Serializer):
    smtp = EmailAccountSerializer(allow_null=True)
    configured = serializers.BooleanField()
    allow_personal_workspaces = serializers.BooleanField()


class InstallationAdminInvitationSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    email = serializers.EmailField()
    expires_at = serializers.DateTimeField()


class InstallationAdminListSerializer(serializers.Serializer):
    administrators = serializers.ListField(child=serializers.DictField())
    invitations = InstallationAdminInvitationSerializer(many=True)


class InstallationAdminAcceptanceSerializer(serializers.Serializer):
    tokens = serializers.DictField(allow_null=True)
    is_superuser = serializers.BooleanField(required=False)

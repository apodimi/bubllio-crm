"""Explicit serializers for workspace API responses without model serializers."""

from rest_framework import serializers


class PersonalWorkspaceStatusSerializer(serializers.Serializer):
    allowed = serializers.BooleanField()
    exists = serializers.BooleanField()


class WorkspaceCreatorGrantSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    user_id = serializers.IntegerField()
    username = serializers.CharField(required=False)
    email = serializers.EmailField()
    granted_at = serializers.DateTimeField(required=False)


class WorkspaceProvisioningSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.SlugField()
    owner_email = serializers.EmailField()
    created_at = serializers.DateTimeField()


class ChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class OrganizationSettingsOptionsSerializer(serializers.Serializer):
    timezones = ChoiceSerializer(many=True)
    locales = ChoiceSerializer(many=True)


class WorkspaceAuditEventSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    action = serializers.CharField()
    actor = serializers.CharField()
    target = serializers.CharField(allow_null=True)
    details = serializers.DictField()
    created_at = serializers.DateTimeField()


class WorkspaceDataExportSerializer(serializers.Serializer):
    format = serializers.CharField()
    format_version = serializers.IntegerField()
    generated_at = serializers.DateTimeField()
    workspace = serializers.DictField()


class DetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class EmailTestSerializer(serializers.Serializer):
    recipient = serializers.EmailField(write_only=True)

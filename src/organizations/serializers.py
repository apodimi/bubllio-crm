from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Organization, OrganizationMembership


User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "current_user_role",
            "created_at",
            "updated_at",
        ]

    def get_current_user_role(self, obj):
        request = self.context.get("request")
        if not request or request.user.is_superuser:
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

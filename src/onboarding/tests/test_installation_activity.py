import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import (
    EmailAccount,
    InstallationState,
    Organization,
    OrganizationInvitation,
    OrganizationMembership,
    WorkspaceAccessEvent,
)


User = get_user_model()


class InstallationActivityTests(APITestCase):
    def setUp(self):
        self.administrator = User.objects.create_superuser(
            username="installation-admin",
            email="admin@example.com",
            password="admin-password",
        )
        self.member = User.objects.create_user(
            username="member",
            email="member@example.com",
            password="member-password",
        )
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.member,
            role=OrganizationMembership.Role.MEMBER,
        )

    def test_only_installation_admin_can_read_activity(self):
        WorkspaceAccessEvent.objects.create(
            action=WorkspaceAccessEvent.Action.CHANGE_MEMBER_ROLE,
            actor=self.administrator,
            target_user=self.member,
            organization_id=self.organization.id,
            details={"previous_role": "viewer", "new_role": "member"},
        )
        url = reverse("installation-audit-log")

        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.administrator)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["action"], "Change member role")
        self.assertEqual(response.data[0]["actor"], "installation-admin")
        self.assertEqual(response.data[0]["target"], "member")
        self.assertEqual(
            response.data[0]["details"],
            {"previous_role": "viewer", "new_role": "member"},
        )
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_data_export_excludes_credentials_and_records_download(self):
        EmailAccount.objects.create(
            organization=self.organization,
            name="Primary",
            host="smtp.example.com",
            port=587,
            username="mailer",
            encrypted_password="never-export-this-password",
            from_email="hello@example.com",
            is_default=True,
        )
        OrganizationInvitation.objects.create(
            organization=self.organization,
            email="invited@example.com",
            role=OrganizationMembership.Role.VIEWER,
            token_hash="never-export-this-token",
            invited_by=self.administrator,
            expires_at=timezone.now() + timedelta(days=7),
        )
        state = InstallationState.objects.get(pk=1)
        state.completed_at = timezone.now()
        state.save(update_fields=("completed_at",))
        url = reverse("installation-data-export")

        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.administrator)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["format"], "bubllio-data-export")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertEqual(response["Cache-Control"], "private, no-store")
        serialized = json.dumps(response.data, default=str)
        self.assertNotIn("never-export-this-password", serialized)
        self.assertNotIn("never-export-this-token", serialized)
        self.assertNotIn("admin-password", serialized)
        self.assertTrue(
            WorkspaceAccessEvent.objects.filter(
                action=WorkspaceAccessEvent.Action.DOWNLOAD_DATA_EXPORT,
                actor=self.administrator,
            ).exists()
        )

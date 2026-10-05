from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import EmailAccount, InstallationState, Organization, OrganizationMembership, OrganizationProvisioning, WorkspaceCreatorGrant

User = get_user_model()


class WorkspaceProvisioningTests(APITestCase):
    def setUp(self):
        self.it = User.objects.create_superuser("it", "it@example.com", "strong-test-password")
        self.member = User.objects.create_user("member", "member@example.com", "strong-test-password")
        self.owner = User.objects.create_user("owner", "owner@example.com", "strong-test-password")
        source = Organization.objects.create(name="Installation", slug="installation")
        account = EmailAccount.objects.create(organization=source, name="Fallback", host="smtp.example.com", port=587, username="mailer", encrypted_password="encrypted", from_email="mailer@example.com", is_default=True)
        state = InstallationState.objects.get(pk=1)
        state.fallback_email_account = account
        state.completed_at = timezone.now()
        state.save(update_fields=("fallback_email_account", "completed_at"))

    def test_only_installation_admin_can_create_workspace(self):
        WorkspaceCreatorGrant.objects.create(user=self.member, granted_by=self.it)
        self.client.force_authenticate(self.member)
        response = self.client.post(reverse("organization-list"), {"name": "Blocked", "slug": "blocked", "owner_email": self.owner.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Organization.objects.filter(slug="blocked").exists())
        self.assertFalse(self.client.get(reverse("current-user")).data["can_create_workspaces"])

    def test_users_only_list_workspaces_where_they_are_members(self):
        visible = Organization.objects.create(name="Visible", slug="visible")
        OrganizationMembership.objects.create(organization=visible, user=self.member, role=OrganizationMembership.Role.MEMBER)
        Organization.objects.create(name="Hidden", slug="hidden")
        self.client.force_authenticate(self.member)
        response = self.client.get(reverse("organization-list"))
        self.assertEqual([item["id"] for item in response.data], [str(visible.id)])

    def test_installation_admin_can_create_owned_workspace(self):
        self.client.force_authenticate(self.it)
        response = self.client.post(reverse("organization-list"), {"name": "IT owned", "slug": "it-owned"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["owner_invitation_pending"])
        self.assertEqual(OrganizationMembership.objects.get(organization_id=response.data["id"]).user, self.it)

    def test_nominated_owner_sees_workspace_only_after_accepting_invitation(self):
        self.client.force_authenticate(self.it)
        with patch("organizations.services.provisioning.send_invitation_email") as send:
            created = self.client.post(reverse("organization-list"), {"name": "Client", "slug": "client", "owner_email": self.owner.email}, format="json")
        token = send.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        organization_id = created.data["id"]
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(reverse("organization-list")).data, [])
        accepted = self.client.post(reverse("invitation-accept", kwargs={"token": token}), {}, format="json")
        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(self.client.get(reverse("organization-list")).data), 1)
        self.assertFalse(OrganizationProvisioning.objects.filter(organization_id=organization_id).exists())
        self.assertFalse(OrganizationMembership.objects.filter(organization_id=organization_id, user=self.it).exists())

    def test_non_admin_cannot_manage_pending_workspace(self):
        self.client.force_authenticate(self.it)
        with patch("organizations.services.provisioning.send_invitation_email"):
            created = self.client.post(reverse("organization-list"), {"name": "Client", "slug": "client", "owner_email": self.owner.email}, format="json")
        url = reverse("workspace-provisioning-detail", kwargs={"organization_id": created.data["id"]})
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(reverse("workspace-provisioning-list")).data, [])
        self.assertEqual(self.client.post(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)

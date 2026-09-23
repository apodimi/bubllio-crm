from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    EmailAccount, InstallationState, Organization, OrganizationInvitation,
    OrganizationMembership, OrganizationProvisioning, WorkspaceCreatorGrant,
    WorkspaceAccessEvent,
)

User = get_user_model()


class WorkspaceProvisioningTests(APITestCase):
    def setUp(self):
        self.it = User.objects.create_superuser("it", "it@example.com", "strong-test-password")
        self.creator = User.objects.create_user("creator", "creator@example.com", "strong-test-password")
        self.other = User.objects.create_user("other", "other@example.com", "strong-test-password")
        self.owner = User.objects.create_user("owner", "owner@example.com", "strong-test-password")
        source = Organization.objects.create(name="Installation", slug="installation")
        account = EmailAccount.objects.create(
            organization=source, name="Fallback", host="smtp.example.com", port=587,
            username="mailer", encrypted_password="encrypted", from_email="mailer@example.com",
            is_default=True,
        )
        state = InstallationState.objects.get(pk=1)
        state.fallback_email_account = account
        state.completed_at = timezone.now()
        state.save(update_fields=("fallback_email_account", "completed_at"))

    def grant_creator(self):
        self.client.force_authenticate(self.it)
        response = self.client.post(
            reverse("workspace-creators"), {"email": self.creator.email}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(self.creator.is_superuser)
        self.assertFalse(self.creator.is_staff)
        self.assertEqual(
            WorkspaceAccessEvent.objects.filter(action="grant_creator", target_user=self.creator).count(), 1
        )

    def create_pending(self, email="owner@example.com"):
        self.client.force_authenticate(self.creator)
        with patch("organizations.provisioning.send_invitation_email") as send:
            response = self.client.post(
                reverse("organization-list"),
                {"name": "Client", "slug": "client", "owner_email": email},
                format="json",
            )
        self.assertEqual(response.status_code, 201, response.data)
        return response, send.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]

    def test_only_installation_admin_grants_and_revokes_existing_creator(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(reverse("workspace-creators"), {"email": self.creator.email}).status_code, 403)
        self.assertEqual(self.client.get(reverse("workspace-creators")).status_code, 403)
        self.client.force_authenticate(self.it)
        self.assertEqual(self.client.post(reverse("workspace-creators"), {"email": "absent@example.com"}).status_code, 400)
        self.grant_creator()
        self.client.force_authenticate(self.creator)
        self.assertTrue(self.client.get(reverse("current-user")).data["can_create_workspaces"])
        self.client.force_authenticate(self.it)
        grant_id = WorkspaceCreatorGrant.objects.get(user=self.creator).id
        self.assertEqual(self.client.delete(reverse("workspace-creator-detail", kwargs={"grant_id": grant_id})).status_code, 204)
        self.assertTrue(WorkspaceAccessEvent.objects.filter(action="revoke_creator", target_user=self.creator).exists())
        self.client.force_authenticate(self.creator)
        self.assertFalse(self.client.get(reverse("current-user")).data["can_create_workspaces"])
        self.assertEqual(self.client.post(reverse("organization-list"), {"name": "X", "slug": "x", "owner_email": self.owner.email}).status_code, 403)

    def test_creator_grant_does_not_allow_installation_or_other_workspace_access(self):
        self.grant_creator()
        self.client.force_authenticate(self.creator)
        self.assertEqual(self.client.get(reverse("installation-settings")).status_code, 403)
        self.assertEqual(self.client.get(reverse("installation-admin-invitations")).status_code, 403)
        installation = Organization.objects.get(slug="installation")
        self.assertEqual(
            self.client.get(reverse("organization-detail", kwargs={"organization_id": installation.id})).status_code,
            404,
        )

    def test_pending_workspace_is_hidden_until_owner_accepts(self):
        self.grant_creator()
        response, token = self.create_pending()
        organization_id = response.data["id"]
        self.assertTrue(response.data["owner_invitation_pending"])
        self.assertTrue(OrganizationProvisioning.objects.filter(organization_id=organization_id).exists())
        self.assertEqual(self.client.get(reverse("organization-list")).data, [])
        self.assertEqual(self.client.get(reverse("current-user")).data["organizations"], [])
        self.assertEqual(self.client.get(reverse("organization-detail", kwargs={"organization_id": organization_id})).status_code, 404)
        self.assertEqual(self.client.get(reverse("organization-membership-list", kwargs={"organization_id": organization_id})).status_code, 404)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(reverse("workspace-provisioning-list")).data, [])
        self.client.force_authenticate(self.creator)
        self.assertEqual(len(self.client.get(reverse("workspace-provisioning-list")).data), 1)
        self.client.force_authenticate(self.owner)
        accepted = self.client.post(reverse("invitation-accept", kwargs={"token": token}), {}, format="json")
        self.assertEqual(accepted.status_code, 201)
        self.assertEqual(accepted.data["role"], "owner")
        self.assertFalse(OrganizationProvisioning.objects.filter(organization_id=organization_id).exists())
        self.assertFalse(OrganizationMembership.objects.filter(organization_id=organization_id, user=self.creator).exists())
        self.assertTrue(WorkspaceAccessEvent.objects.filter(action="accept_owner_invitation", organization_id=organization_id).exists())
        self.assertEqual(OrganizationMembership.objects.get(organization_id=organization_id).user, self.owner)
        self.assertEqual(len(self.client.get(reverse("organization-list")).data), 1)
        self.client.force_authenticate(self.creator)
        self.assertEqual(self.client.get(reverse("organization-list")).data, [])
        self.assertEqual(self.client.get(reverse("organization-detail", kwargs={"organization_id": organization_id})).status_code, 404)

    def test_new_owner_registers_through_invitation(self):
        self.grant_creator()
        response, token = self.create_pending("new-owner@example.com")
        self.client.force_authenticate(user=None)
        accepted = self.client.post(
            reverse("invitation-accept", kwargs={"token": token}),
            {"username": "new-owner", "password": "a-strong-unique-password-4938", "display_name": "New Owner"},
            format="json",
        )
        self.assertEqual(accepted.status_code, 201, accepted.data)
        self.assertEqual(OrganizationMembership.objects.get(organization_id=response.data["id"]).user.email, "new-owner@example.com")
        self.assertEqual(self.client.post(reverse("invitation-accept", kwargs={"token": token})).status_code, 404)

    def test_wrong_user_cannot_accept_owner_invitation(self):
        self.grant_creator()
        response, token = self.create_pending()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(reverse("invitation-accept", kwargs={"token": token})).status_code, 403)
        self.assertTrue(OrganizationProvisioning.objects.filter(organization_id=response.data["id"]).exists())

    def test_creator_grant_can_be_revoked_while_handoff_is_pending(self):
        self.grant_creator()
        response, _ = self.create_pending()
        self.client.force_authenticate(self.it)
        grant_id = WorkspaceCreatorGrant.objects.get(user=self.creator).id
        self.assertEqual(
            self.client.delete(reverse("workspace-creator-detail", kwargs={"grant_id": grant_id})).status_code,
            204,
        )
        self.client.force_authenticate(self.creator)
        self.assertFalse(self.client.get(reverse("current-user")).data["can_create_workspaces"])
        self.assertEqual(len(self.client.get(reverse("workspace-provisioning-list")).data), 1)
        url = reverse("workspace-provisioning-detail", kwargs={"organization_id": response.data["id"]})
        with patch("organizations.provisioning.send_invitation_email"):
            self.assertEqual(self.client.post(url).status_code, 200)

    def test_delegated_creator_must_nominate_valid_owner_email(self):
        self.grant_creator()
        self.client.force_authenticate(self.creator)
        for email in (None, "not-an-email"):
            body = {"name": "Client", "slug": "client"}
            if email is not None:
                body["owner_email"] = email
            self.assertEqual(self.client.post(reverse("organization-list"), body, format="json").status_code, 400)
        self.assertFalse(Organization.objects.filter(slug="client").exists())

    def test_missing_smtp_and_delivery_failure_roll_back_workspace(self):
        self.grant_creator()
        state = InstallationState.objects.get(pk=1)
        state.fallback_email_account = None
        state.save(update_fields=("fallback_email_account",))
        self.client.force_authenticate(self.creator)
        body = {"name": "Client", "slug": "client", "owner_email": self.owner.email}
        self.assertEqual(self.client.post(reverse("organization-list"), body, format="json").status_code, 400)
        self.assertFalse(Organization.objects.filter(slug="client").exists())
        state.fallback_email_account = EmailAccount.objects.get(name="Fallback")
        state.save(update_fields=("fallback_email_account",))
        with patch("organizations.provisioning.send_invitation_email", side_effect=RuntimeError("SMTP failed")):
            self.assertEqual(self.client.post(reverse("organization-list"), body, format="json").status_code, 502)
        self.assertFalse(Organization.objects.filter(slug="client").exists())
        self.assertFalse(OrganizationInvitation.objects.filter(email=self.owner.email).exists())
        self.assertFalse(WorkspaceAccessEvent.objects.filter(action="create_workspace").exists())

    def test_resend_and_cancel_are_limited_to_creator_or_it(self):
        self.grant_creator()
        response, old_token = self.create_pending()
        url = reverse("workspace-provisioning-detail", kwargs={"organization_id": response.data["id"]})
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.client.force_authenticate(self.creator)
        with patch("organizations.provisioning.send_invitation_email") as send:
            self.assertEqual(self.client.post(url).status_code, 200)
        new_token = send.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        self.assertNotEqual(old_token, new_token)
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": old_token})).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(Organization.objects.filter(slug="client").exists())
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": new_token})).status_code, 404)

    def test_failed_resend_keeps_original_owner_invitation(self):
        self.grant_creator()
        response, token = self.create_pending()
        url = reverse("workspace-provisioning-detail", kwargs={"organization_id": response.data["id"]})
        self.client.force_authenticate(self.creator)
        with patch("organizations.provisioning.send_invitation_email", side_effect=RuntimeError("SMTP failed")):
            self.assertEqual(self.client.post(url).status_code, 502)
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": token})).status_code, 200)
        self.assertFalse(
            WorkspaceAccessEvent.objects.filter(
                action="resend_owner_invitation", organization_id=response.data["id"]
            ).exists()
        )

    def test_self_nominated_creator_is_owner_without_pending_invitation(self):
        self.grant_creator()
        self.client.force_authenticate(self.creator)
        response = self.client.post(
            reverse("organization-list"),
            {"name": "Mine", "slug": "mine", "owner_email": self.creator.email},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["owner_invitation_pending"])
        self.assertFalse(OrganizationProvisioning.objects.filter(organization_id=response.data["id"]).exists())
        self.assertEqual(self.client.get(reverse("organization-list")).data[0]["id"], response.data["id"])

    def test_installation_admin_can_still_create_without_owner_email(self):
        self.it.email = ""
        self.it.save(update_fields=("email",))
        self.client.force_authenticate(self.it)
        response = self.client.post(
            reverse("organization-list"), {"name": "IT owned", "slug": "it-owned"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["owner_invitation_pending"])
        self.assertEqual(OrganizationMembership.objects.get(organization_id=response.data["id"]).user, self.it)

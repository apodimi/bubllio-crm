from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from organizations.models import EmailAccount, InstallationAdminInvitation, InstallationState, Organization, OrganizationMembership

User = get_user_model()


class InstallationAdminInvitationTests(APITestCase):
    def setUp(self):
        self.administrator = User.objects.create_superuser(
            username="it-one", email="it-one@example.com", password="strong-test-password"
        )
        self.employee = User.objects.create_user(
            username="employee", email="employee@example.com", password="strong-test-password"
        )
        self.organization = Organization.objects.create(name="Company", slug="company")
        OrganizationMembership.objects.create(organization=self.organization, user=self.employee, role="member")
        account = EmailAccount.objects.create(
            organization=self.organization, name="Installation", host="smtp.example.com",
            port=587, username="mailer", encrypted_password="encrypted",
            from_email="hello@example.com", is_default=True,
        )
        state = InstallationState.objects.get(pk=1)
        state.fallback_email_account = account
        state.completed_at = timezone.now()
        state.save(update_fields=("fallback_email_account", "completed_at"))
        self.url = reverse("installation-admin-invitations")

    def invite(self, email="it-two@example.com"):
        self.client.force_authenticate(self.administrator)
        with patch("onboarding.api.installation_admins.send_installation_admin_invitation_email") as send:
            response = self.client.post(self.url, {"email": email}, format="json")
        return response, send

    def test_only_installation_admin_can_invite(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.post(self.url, {"email": "it-two@example.com"}).status_code, 403)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.employee.is_staff = True
        self.employee.save(update_fields=("is_staff",))
        self.assertEqual(self.client.post(self.url, {"email": "it-two@example.com"}).status_code, 403)
        self.assertEqual(self.client.get(reverse("installation-settings")).status_code, 403)
        self.assertFalse(InstallationAdminInvitation.objects.exists())

    def test_missing_installation_smtp_blocks_invitation(self):
        state = InstallationState.objects.get(pk=1)
        state.fallback_email_account = None
        state.save(update_fields=("fallback_email_account",))
        self.client.force_authenticate(self.administrator)
        response = self.client.post(self.url, {"email": "it-two@example.com"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(InstallationAdminInvitation.objects.exists())

    def test_new_admin_accepts_once_without_workspace_access(self):
        response, send = self.invite()
        self.assertEqual(response.status_code, 201)
        token = send.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        self.assertNotEqual(InstallationAdminInvitation.objects.get().token_hash, token)
        self.client.force_authenticate(user=None)
        preview = self.client.get(reverse("installation-admin-invitation-detail", kwargs={"token": token}))
        self.assertEqual(preview.data["email"], "it-two@example.com")
        accepted = self.client.post(
            reverse("installation-admin-invitation-accept", kwargs={"token": token}),
            {"username": "it-two", "password": "a-strong-unique-password-4938", "display_name": "IT Two"},
            format="json",
        )
        self.assertEqual(accepted.status_code, 201)
        invited = User.objects.get(username="it-two")
        self.assertTrue(invited.is_superuser)
        self.assertTrue(invited.is_staff)
        self.assertFalse(OrganizationMembership.objects.filter(user=invited).exists())
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {accepted.data['tokens']['access']}")
        self.assertEqual(self.client.get(reverse("organization-list")).data, [])
        self.assertEqual(
            self.client.post(reverse("installation-admin-invitation-accept", kwargs={"token": token})).status_code,
            404,
        )

    def test_existing_user_requires_matching_account_then_is_promoted(self):
        _, send = self.invite(email=self.employee.email)
        token = send.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        url = reverse("installation-admin-invitation-accept", kwargs={"token": token})
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(url, {"username": "duplicate"}).status_code, 409)
        self.client.force_authenticate(self.administrator)
        self.assertEqual(self.client.post(url).status_code, 403)
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.post(url).status_code, 201)
        self.employee.refresh_from_db()
        self.assertTrue(self.employee.is_superuser)
        self.assertEqual(self.client.get(reverse("organization-list")).data[0]["id"], str(self.organization.id))

    def test_expired_and_failed_delivery_do_not_grant_admin(self):
        _, send = self.invite()
        token = send.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        invitation = InstallationAdminInvitation.objects.get()
        invitation.expires_at = timezone.now() - timedelta(seconds=1)
        invitation.save(update_fields=("expires_at",))
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(reverse("installation-admin-invitation-accept", kwargs={"token": token})).status_code, 404)
        self.client.force_authenticate(self.administrator)
        with patch("onboarding.api.installation_admins.send_installation_admin_invitation_email", side_effect=RuntimeError("SMTP down")):
            response = self.client.post(self.url, {"email": "other@example.com"}, format="json")
        self.assertEqual(response.status_code, 502)
        self.assertFalse(InstallationAdminInvitation.objects.filter(email="other@example.com").exists())

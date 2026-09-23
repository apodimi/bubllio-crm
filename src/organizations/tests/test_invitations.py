from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import EmailAccount, Organization, OrganizationInvitation, OrganizationMembership


User = get_user_model()


class InvitationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", email="owner@example.com")
        self.member = User.objects.create_user(username="member", email="member@example.com")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        OrganizationMembership.objects.create(organization=self.organization, user=self.owner, role="owner")
        OrganizationMembership.objects.create(organization=self.organization, user=self.member, role="member")
        self.account = EmailAccount.objects.create(
            organization=self.organization, name="Primary", host="smtp.example.com",
            port=587, username="mailer", encrypted_password="placeholder",
            from_email="hello@example.com", is_default=True,
        )
        self.url = reverse("organization-invitation-list", kwargs={"organization_id": self.organization.id})

    def invite(self, email="new@example.com", role="viewer"):
        self.client.force_authenticate(self.owner)
        with patch("organizations.api.invitations.send_invitation_email") as sender:
            response = self.client.post(self.url, {"email": email, "role": role}, format="json")
        return response, sender

    def test_invite_creates_hashed_token_and_registration_adds_membership(self):
        response, sender = self.invite()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(sender.call_count, 1)
        invite_url = sender.call_args.kwargs["invite_url"]
        token = invite_url.rsplit("/", 1)[-1]
        invitation = OrganizationInvitation.objects.get(id=response.data["id"])
        self.assertNotEqual(invitation.token_hash, token)
        self.client.force_authenticate(user=None)
        preview = self.client.get(reverse("invitation-detail", kwargs={"token": token}))
        self.assertEqual(preview.data["organization_name"], "Nerds Lab")
        accepted = self.client.post(
            reverse("invitation-accept", kwargs={"token": token}),
            {"username": "new-person", "password": "a-strong-unique-password-4938", "display_name": "New Person"}, format="json",
        )
        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", accepted.data["tokens"])
        self.assertTrue(OrganizationMembership.objects.filter(
            organization=self.organization, user__username="new-person", role="viewer",
        ).exists())
        self.assertEqual(self.client.post(reverse("invitation-accept", kwargs={"token": token})).status_code, 404)

    def test_existing_user_must_sign_in_with_invited_email(self):
        existing = User.objects.create_user(username="existing", email="existing@example.com")
        _, sender = self.invite(email=existing.email)
        token = sender.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        url = reverse("invitation-accept", kwargs={"token": token})
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(url, {"username": "duplicate", "password": "long-password-4938"}).status_code, 409)
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.post(url).status_code, 403)
        self.client.force_authenticate(existing)
        self.assertEqual(self.client.post(url).status_code, 201)
        self.assertTrue(OrganizationMembership.objects.filter(organization=self.organization, user=existing).exists())

    def test_member_cannot_invite_and_admin_cannot_invite_admin(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.post(self.url, {"email": "new@example.com", "role": "viewer"}).status_code, 404)
        admin = User.objects.create_user(username="admin")
        OrganizationMembership.objects.create(organization=self.organization, user=admin, role="admin")
        self.client.force_authenticate(admin)
        self.assertEqual(self.client.post(self.url, {"email": "new@example.com", "role": "admin"}).status_code, 403)

    def test_missing_smtp_or_delivery_failure_does_not_create_invite(self):
        self.account.is_active = False
        self.account.save(update_fields=("is_active",))
        self.assertEqual(self.invite()[0].status_code, 400)
        self.account.is_active = True
        self.account.save(update_fields=("is_active",))
        self.client.force_authenticate(self.owner)
        with patch("organizations.api.invitations.send_invitation_email", side_effect=RuntimeError("SMTP down")):
            response = self.client.post(self.url, {"email": "new@example.com", "role": "viewer"}, format="json")
        self.assertEqual(response.status_code, 502)
        self.assertFalse(OrganizationInvitation.objects.exists())

    def test_expired_and_replaced_links_cannot_be_accepted(self):
        first, sender = self.invite()
        first_token = sender.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        second, sender = self.invite()
        second_token = sender.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        self.assertNotEqual(first.data["id"], second.data["id"])
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": first_token})).status_code, 404)
        invitation = OrganizationInvitation.objects.get(id=second.data["id"])
        invitation.expires_at = timezone.now() - timedelta(seconds=1)
        invitation.save(update_fields=("expires_at",))
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(reverse("invitation-accept", kwargs={"token": second_token})).status_code, 404)

    def test_invited_user_cannot_create_a_separate_workspace(self):
        _, sender = self.invite(role="member")
        token = sender.call_args.kwargs["invite_url"].rsplit("/", 1)[-1]
        self.client.force_authenticate(user=None)
        accepted = self.client.post(
            reverse("invitation-accept", kwargs={"token": token}),
            {"username": "new-person", "password": "a-strong-unique-password-4938", "display_name": "New Person"}, format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {accepted.data['tokens']['access']}")
        created = self.client.post(reverse("organization-list"), {"name": "My Studio", "slug": "my-studio"}, format="json")
        self.assertEqual(created.status_code, 403)
        self.assertEqual(OrganizationMembership.objects.get(organization=self.organization, user__username="new-person").role, "member")

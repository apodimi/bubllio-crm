from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from delivery.models import OutboxMessage
from organizations.models import (
    EmailAccount,
    Organization,
    OrganizationInvitation,
    OrganizationMembership,
    WorkspaceAccessEvent,
)


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
        with patch("access.services.invitations.queue_outbox_message") as sender:
            response = self.client.post(self.url, {"email": email, "role": role}, format="json")
        return response, sender

    @staticmethod
    def queued_token(sender):
        return sender.call_args.kwargs["secret"]

    def test_invite_creates_hashed_token_and_registration_adds_membership(self):
        response, sender = self.invite()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(sender.call_count, 1)
        token = self.queued_token(sender)
        self.assertEqual(sender.call_args.kwargs["kind"], OutboxMessage.Kind.WORKSPACE_INVITATION)
        invitation = OrganizationInvitation.objects.get(id=response.data["id"])
        self.assertNotEqual(invitation.token_hash, token)
        invited_event = WorkspaceAccessEvent.objects.get(action="invite_member")
        self.assertEqual(invited_event.actor, self.owner)
        self.assertEqual(invited_event.organization_id, self.organization.id)
        self.assertEqual(invited_event.details["email"], "new@example.com")
        self.assertEqual(invited_event.details["role"], "viewer")
        self.assertEqual(invited_event.details["invitation_id"], str(invitation.id))
        self.assertNotIn(token, str(invited_event.details))
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
        accepted_event = WorkspaceAccessEvent.objects.get(action="accept_member_invitation")
        self.assertEqual(accepted_event.target_user.username, "new-person")
        self.assertEqual(accepted_event.details["role"], "viewer")
        self.assertEqual(self.client.post(reverse("invitation-accept", kwargs={"token": token})).status_code, 404)

    def test_existing_user_must_sign_in_with_invited_email(self):
        existing = User.objects.create_user(username="existing", email="existing@example.com")
        _, sender = self.invite(email=existing.email)
        token = self.queued_token(sender)
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
        with patch("access.services.invitations.queue_outbox_message", side_effect=RuntimeError("Queue down")):
            response = self.client.post(self.url, {"email": "new@example.com", "role": "viewer"}, format="json")
        self.assertEqual(response.status_code, 500)
        self.assertFalse(OrganizationInvitation.objects.exists())

    def test_expired_and_replaced_links_cannot_be_accepted(self):
        first, sender = self.invite()
        first_token = self.queued_token(sender)
        second, sender = self.invite()
        second_token = self.queued_token(sender)
        self.assertNotEqual(first.data["id"], second.data["id"])
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": first_token})).status_code, 404)
        invitation = OrganizationInvitation.objects.get(id=second.data["id"])
        invitation.expires_at = timezone.now() - timedelta(seconds=1)
        invitation.save(update_fields=("expires_at",))
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(reverse("invitation-accept", kwargs={"token": second_token})).status_code, 404)

    def test_list_returns_typed_invitation_history(self):
        _, sender = self.invite(email="pending@example.com")
        pending_token = self.queued_token(sender)
        pending = OrganizationInvitation.objects.get(token_hash__isnull=False, email="pending@example.com")
        expired = OrganizationInvitation.objects.create(
            organization=self.organization,
            email="expired@example.com",
            role="member",
            token_hash="expired-token-hash",
            invited_by=self.owner,
            expires_at=timezone.now() - timedelta(days=1),
        )
        accepted = OrganizationInvitation.objects.create(
            organization=self.organization,
            email="accepted@example.com",
            role="viewer",
            token_hash="accepted-token-hash",
            invited_by=self.owner,
            expires_at=timezone.now() + timedelta(days=1),
            accepted_at=timezone.now(),
        )
        revoked = OrganizationInvitation.objects.create(
            organization=self.organization,
            email="revoked@example.com",
            role="viewer",
            token_hash="revoked-token-hash",
            invited_by=self.owner,
            expires_at=timezone.now() + timedelta(days=1),
            revoked_at=timezone.now(),
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        statuses = {item["id"]: item["status"] for item in response.data}
        self.assertEqual(statuses[str(pending.id)], "pending")
        self.assertEqual(statuses[str(expired.id)], "expired")
        self.assertEqual(statuses[str(accepted.id)], "accepted")
        self.assertEqual(statuses[str(revoked.id)], "revoked")
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": pending_token})).status_code, 200)
        pending_row = next(item for item in response.data if item["id"] == str(pending.id))
        self.assertEqual(pending_row["invited_by"], self.owner.username)
        self.assertIn("created_at", pending_row)

    def test_owner_can_resend_and_revoke_invitation(self):
        _, sender = self.invite()
        original_token = self.queued_token(sender)
        original = OrganizationInvitation.objects.get(email="new@example.com")
        resend_url = reverse(
            "organization-invitation-resend",
            kwargs={"organization_id": self.organization.id, "invitation_id": original.id},
        )
        with patch("access.services.invitations.queue_outbox_message") as resend:
            response = self.client.post(resend_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        original.refresh_from_db()
        self.assertEqual(original.status, OrganizationInvitation.Status.REVOKED)
        replacement = OrganizationInvitation.objects.get(id=response.data["id"])
        self.assertEqual(replacement.status, OrganizationInvitation.Status.PENDING)
        replacement_token = self.queued_token(resend)
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": original_token})).status_code, 404)
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": replacement_token})).status_code, 200)
        self.assertTrue(WorkspaceAccessEvent.objects.filter(
            action=WorkspaceAccessEvent.Action.RESEND_MEMBER_INVITATION,
            organization_id=self.organization.id,
        ).exists())

        self.client.force_authenticate(self.owner)
        revoke_url = reverse(
            "organization-invitation-detail",
            kwargs={"organization_id": self.organization.id, "invitation_id": replacement.id},
        )
        revoked = self.client.delete(revoke_url)
        self.assertEqual(revoked.status_code, status.HTTP_204_NO_CONTENT)
        replacement.refresh_from_db()
        self.assertEqual(replacement.status, OrganizationInvitation.Status.REVOKED)
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": replacement_token})).status_code, 404)
        self.assertTrue(WorkspaceAccessEvent.objects.filter(
            action=WorkspaceAccessEvent.Action.REVOKE_MEMBER_INVITATION,
            organization_id=self.organization.id,
        ).exists())

    def test_invitation_actions_are_tenant_scoped_and_role_protected(self):
        _, _ = self.invite(email="admin-invite@example.com", role="admin")
        invitation = OrganizationInvitation.objects.get(email="admin-invite@example.com")
        other = Organization.objects.create(name="Other", slug="other")
        other_owner = User.objects.create_user(username="other-owner", email="other@example.com")
        OrganizationMembership.objects.create(organization=other, user=other_owner, role="owner")

        self.client.force_authenticate(other_owner)
        cross_tenant = self.client.delete(reverse(
            "organization-invitation-detail",
            kwargs={"organization_id": other.id, "invitation_id": invitation.id},
        ))
        self.assertEqual(cross_tenant.status_code, status.HTTP_404_NOT_FOUND)

        admin = User.objects.create_user(username="workspace-admin", email="workspace-admin@example.com")
        OrganizationMembership.objects.create(organization=self.organization, user=admin, role="admin")
        self.client.force_authenticate(admin)
        forbidden = self.client.post(reverse(
            "organization-invitation-resend",
            kwargs={"organization_id": self.organization.id, "invitation_id": invitation.id},
        ))
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        replace_forbidden = self.client.post(
            self.url,
            {"email": invitation.email, "role": "member"},
            format="json",
        )
        self.assertEqual(replace_forbidden.status_code, status.HTTP_403_FORBIDDEN)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, OrganizationInvitation.Status.PENDING)

    def test_failed_resend_preserves_the_original_invitation(self):
        _, sender = self.invite()
        original_token = self.queued_token(sender)
        invitation = OrganizationInvitation.objects.get(email="new@example.com")
        with patch("access.services.invitations.queue_outbox_message", side_effect=RuntimeError("Queue down")):
            response = self.client.post(reverse(
                "organization-invitation-resend",
                kwargs={"organization_id": self.organization.id, "invitation_id": invitation.id},
            ))

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, OrganizationInvitation.Status.PENDING)
        self.assertEqual(OrganizationInvitation.objects.filter(email="new@example.com").count(), 1)
        self.assertEqual(self.client.get(reverse("invitation-detail", kwargs={"token": original_token})).status_code, 200)

    def test_invited_user_cannot_create_a_separate_workspace(self):
        _, sender = self.invite(role="member")
        token = self.queued_token(sender)
        self.client.force_authenticate(user=None)
        accepted = self.client.post(
            reverse("invitation-accept", kwargs={"token": token}),
            {"username": "new-person", "password": "a-strong-unique-password-4938", "display_name": "New Person"}, format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {accepted.data['tokens']['access']}")
        created = self.client.post(reverse("organization-list"), {"name": "My Studio", "slug": "my-studio"}, format="json")
        self.assertEqual(created.status_code, 403)
        self.assertEqual(OrganizationMembership.objects.get(organization=self.organization, user__username="new-person").role, "member")

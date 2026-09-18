import os
from unittest.mock import patch

from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import EmailAccount, Organization, OrganizationMembership, OrganizationSettings
from .admin import EmailAccountAdminForm


User = get_user_model()


class OrganizationAccessTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="test-pass")
        self.other_user = User.objects.create_user(username="other", password="test-pass")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        self.owner_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.owner,
            role=OrganizationMembership.Role.OWNER,
        )

    def test_anonymous_requests_are_rejected(self):
        response = self.client.get(reverse("organization-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_creating_organization_makes_request_user_owner(self):
        self.client.force_authenticate(self.other_user)
        response = self.client.post(
            reverse("organization-list"),
            {"name": "Acme", "slug": "acme"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        membership = OrganizationMembership.objects.get(
            organization_id=response.data["id"], user=self.other_user
        )
        self.assertEqual(membership.role, OrganizationMembership.Role.OWNER)
        self.assertEqual(response.data["current_user_role"], "owner")

    def test_list_contains_only_users_organizations(self):
        hidden = Organization.objects.create(name="Hidden", slug="hidden")
        OrganizationMembership.objects.create(
            organization=hidden,
            user=self.other_user,
            role=OrganizationMembership.Role.OWNER,
        )
        self.client.force_authenticate(self.owner)
        response = self.client.get(reverse("organization-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [str(self.organization.id)])

    def test_only_owner_can_delete_organization(self):
        admin = User.objects.create_user(username="admin")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=admin,
            role=OrganizationMembership.Role.ADMIN,
        )
        url = reverse("organization-detail", kwargs={"organization_id": self.organization.id})
        self.client.force_authenticate(admin)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT)


class MembershipManagementTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner")
        self.admin = User.objects.create_user(username="admin")
        self.member = User.objects.create_user(username="member")
        self.new_user = User.objects.create_user(username="new-user")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        self.owner_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.owner,
            role=OrganizationMembership.Role.OWNER,
        )
        self.admin_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.admin,
            role=OrganizationMembership.Role.ADMIN,
        )
        self.member_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.member,
            role=OrganizationMembership.Role.MEMBER,
        )

    def list_url(self):
        return reverse(
            "organization-membership-list",
            kwargs={"organization_id": self.organization.id},
        )

    def detail_url(self, membership):
        return reverse(
            "organization-membership-detail",
            kwargs={"organization_id": self.organization.id, "membership_id": membership.id},
        )

    def test_member_cannot_view_membership_list(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(self.list_url()).status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_add_member(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            self.list_url(), {"user_id": self.new_user.id, "role": "viewer"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            OrganizationMembership.objects.filter(
                organization=self.organization,
                user=self.new_user,
                role=OrganizationMembership.Role.VIEWER,
            ).exists()
        )

    def test_admin_cannot_add_another_admin(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url(), {"user_id": self.new_user.id, "role": "admin"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_transfer_ownership(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            self.detail_url(self.member_membership), {"role": "owner"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.owner_membership.refresh_from_db()
        self.member_membership.refresh_from_db()
        self.assertEqual(self.owner_membership.role, OrganizationMembership.Role.ADMIN)
        self.assertEqual(self.member_membership.role, OrganizationMembership.Role.OWNER)

    def test_admin_cannot_change_or_remove_another_admin(self):
        second_admin = User.objects.create_user(username="second-admin")
        second_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=second_admin,
            role=OrganizationMembership.Role.ADMIN,
        )
        self.client.force_authenticate(self.admin)
        changed = self.client.patch(
            self.detail_url(second_membership), {"role": "member"}, format="json"
        )
        removed = self.client.delete(self.detail_url(second_membership))
        self.assertEqual(changed.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(removed.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_cannot_be_removed_before_transfer(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(self.detail_url(self.owner_membership))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrganizationSettingsAndEmailTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner")
        self.viewer = User.objects.create_user(username="viewer")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.owner,
            role=OrganizationMembership.Role.OWNER,
        )
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        self.encryption_key = Fernet.generate_key().decode()

    def settings_url(self):
        return reverse("organization-settings", kwargs={"organization_id": self.organization.id})

    def settings_options_url(self):
        return reverse("organization-settings-options")

    def email_list_url(self):
        return reverse("email-account-list", kwargs={"organization_id": self.organization.id})

    def create_account(self):
        with patch.dict(os.environ, {"BUBLLIO_EMAIL_ENCRYPTION_KEY": self.encryption_key}):
            response = self.client.post(
                self.email_list_url(),
                {
                    "name": "Company SMTP",
                    "host": "smtp.example.com",
                    "port": 587,
                    "username": "mailer@example.com",
                    "password": "smtp-secret",
                    "use_tls": True,
                    "use_ssl": False,
                    "from_email": "mailer@example.com",
                    "is_default": True,
                },
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def test_settings_are_created_for_new_organization(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.settings_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["timezone"], "UTC")
        self.assertTrue(OrganizationSettings.objects.filter(organization=self.organization).exists())

    def test_settings_options_expose_timezone_and_locale_choices(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.settings_options_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn({"value": "UTC", "label": "UTC"}, response.data["timezones"])
        self.assertTrue(any(choice["value"] == "en-us" for choice in response.data["locales"]))

    def test_owner_can_update_settings_but_viewer_cannot(self):
        self.client.force_authenticate(self.owner)
        updated = self.client.patch(self.settings_url(), {"timezone": "Europe/Athens"}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["timezone"], "Europe/Athens")
        self.client.force_authenticate(self.viewer)
        denied = self.client.patch(self.settings_url(), {"timezone": "UTC"}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)

    def test_email_password_is_encrypted_and_never_returned(self):
        self.client.force_authenticate(self.owner)
        response = self.create_account()
        self.assertNotIn("password", response.data)
        account = EmailAccount.objects.get(id=response.data["id"])
        self.assertNotEqual(account.encrypted_password, "smtp-secret")

    def test_viewer_can_list_email_metadata_but_cannot_manage_accounts(self):
        self.client.force_authenticate(self.owner)
        self.create_account()
        self.client.force_authenticate(self.viewer)
        listed = self.client.get(self.email_list_url())
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertNotIn("password", listed.data[0])
        denied = self.client.post(
            self.email_list_url(),
            {"name": "Denied", "host": "smtp.example.com", "username": "x", "password": "x", "from_email": "x@example.com"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)

    def test_tls_and_ssl_cannot_both_be_enabled(self):
        self.client.force_authenticate(self.owner)
        with patch.dict(os.environ, {"BUBLLIO_EMAIL_ENCRYPTION_KEY": self.encryption_key}):
            response = self.client.post(
                self.email_list_url(),
                {
                    "name": "Invalid SMTP",
                    "host": "smtp.example.com",
                    "username": "mailer@example.com",
                    "password": "secret",
                    "use_tls": True,
                    "use_ssl": True,
                    "from_email": "mailer@example.com",
                },
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_setting_another_account_as_default_is_atomic(self):
        self.client.force_authenticate(self.owner)
        first = self.create_account()
        with patch.dict(os.environ, {"BUBLLIO_EMAIL_ENCRYPTION_KEY": self.encryption_key}):
            second = self.client.post(
                self.email_list_url(),
                {
                    "name": "Backup SMTP",
                    "host": "smtp.backup.example.com",
                    "port": 587,
                    "username": "backup@example.com",
                    "password": "backup-secret",
                    "use_tls": True,
                    "use_ssl": False,
                    "from_email": "backup@example.com",
                    "is_default": False,
                },
                format="json",
            )
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        patch_url = reverse(
            "email-account-detail",
            kwargs={"organization_id": self.organization.id, "account_id": second.data["id"]},
        )
        updated = self.client.patch(patch_url, {"is_default": True}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertFalse(EmailAccount.objects.get(id=first.data["id"]).is_default)
        self.assertTrue(EmailAccount.objects.get(id=second.data["id"]).is_default)

    def test_test_email_marks_account_as_tested(self):
        self.client.force_authenticate(self.owner)
        response = self.create_account()
        account = EmailAccount.objects.get(id=response.data["id"])
        test_url = reverse(
            "email-account-test",
            kwargs={"organization_id": self.organization.id, "account_id": account.id},
        )
        with patch("organizations.views.send_test_email") as send:
            with patch.dict(os.environ, {"BUBLLIO_EMAIL_ENCRYPTION_KEY": self.encryption_key}):
                tested = self.client.post(test_url, {"recipient": "owner@example.com"}, format="json")
        self.assertEqual(tested.status_code, status.HTTP_200_OK)
        send.assert_called_once_with(account=account, recipient="owner@example.com")
        account.refresh_from_db()
        self.assertIsNotNone(account.last_tested_at)
        self.assertEqual(account.last_test_error, "")

    def test_test_email_failure_is_sanitized(self):
        self.client.force_authenticate(self.owner)
        response = self.create_account()
        account = EmailAccount.objects.get(id=response.data["id"])
        test_url = reverse(
            "email-account-test",
            kwargs={"organization_id": self.organization.id, "account_id": account.id},
        )
        with patch("organizations.views.send_test_email", side_effect=RuntimeError("SMTP unavailable")):
            tested = self.client.post(test_url, {"recipient": "owner@example.com"}, format="json")
        self.assertEqual(tested.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(tested.data["status"], "failed")
        account.refresh_from_db()
        self.assertEqual(account.last_test_error, "SMTP unavailable")

    def test_admin_form_encrypts_new_account_password(self):
        form_data = {
            "name": "Admin SMTP",
            "provider": "smtp",
            "organization": str(self.organization.id),
            "host": "smtp.example.com",
            "port": 587,
            "username": "mailer@example.com",
            "password": "admin-secret",
            "use_tls": True,
            "use_ssl": False,
            "from_email": "mailer@example.com",
            "from_name": "Bubllio CRM",
            "is_default": False,
            "is_active": True,
        }
        with patch.dict(os.environ, {"BUBLLIO_EMAIL_ENCRYPTION_KEY": self.encryption_key}):
            form = EmailAccountAdminForm(data=form_data)
            self.assertTrue(form.is_valid(), form.errors)
            account = form.save()
        self.assertNotEqual(account.encrypted_password, "admin-secret")


class RestAuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="rest-user",
            password="strong-test-password",
            email="rest@example.com",
        )
        self.organization = Organization.objects.create(name="REST Org", slug="rest-org")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.user,
            role=OrganizationMembership.Role.OWNER,
        )

    def test_token_login_and_me_are_json_endpoints(self):
        token_response = self.client.post(
            reverse("token-obtain-pair"),
            {"username": "rest-user", "password": "strong-test-password"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", token_response.data)
        self.assertIn("refresh", token_response.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")
        me_response = self.client.get(reverse("current-user"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["username"], "rest-user")
        self.assertEqual(me_response.data["organizations"][0]["id"], str(self.organization.id))

    def test_logout_blacklists_refresh_token(self):
        token_response = self.client.post(
            reverse("token-obtain-pair"),
            {"username": "rest-user", "password": "strong-test-password"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")
        logout_response = self.client.post(
            reverse("logout"),
            {"refresh": token_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)
        refresh_response = self.client.post(
            reverse("token-refresh"),
            {"refresh": token_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

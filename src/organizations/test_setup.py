from unittest.mock import patch

from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .email_security import decrypt_secret
from .email_service import send_setup_test_email
from .models import EmailAccount, InstallationState, Organization, OrganizationMembership, OrganizationSettings


class InstallationSetupTests(APITestCase):
    setup_token = "test-install-token-with-at-least-32-chars"

    def setUp(self):
        cache.clear()
        self.url = reverse("installation-setup")
        self.smtp_test_url = reverse("installation-smtp-test")
        self.settings_url = reverse("installation-settings")
        self.payload = {
            "setup_token": self.setup_token,
            "username": "first-admin",
            "email": "admin@example.com",
            "password": "a-strong-unique-password-4938",
            "organization_name": "Nerds Lab",
            "organization_slug": "nerds-lab",
        }
        self.token_env = patch.dict("os.environ", {"BUBLLIO_SETUP_TOKEN": self.setup_token})
        self.token_env.start()
        self.addCleanup(self.token_env.stop)

    def test_status_is_available_only_for_uninitialized_installation(self):
        self.assertEqual(self.client.get(self.url).data, {"available": True})
        get_user_model().objects.create_user(username="existing")
        self.assertEqual(self.client.get(self.url).data, {"available": False})

    def test_existing_organization_disables_setup_even_without_users(self):
        Organization.objects.create(name="Existing", slug="existing")
        self.assertEqual(self.client.get(self.url).data, {"available": False})
        self.assertEqual(self.client.post(self.url, self.payload, format="json").status_code, status.HTTP_403_FORBIDDEN)

    def test_personal_workspace_is_opt_in(self):
        self.assertEqual(self.client.post(self.url, self.payload, format="json").status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(username="first-admin")
        self.client.force_authenticate(user)
        policy = self.client.patch(
            self.settings_url,
            {"allow_personal_workspaces": True},
            format="json",
        )
        self.assertEqual(policy.status_code, status.HTTP_200_OK)
        response = self.client.post(reverse("personal-workspace"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_personal"])
        again = self.client.post(reverse("personal-workspace"), {}, format="json")
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(Organization.objects.filter(personal_owner=user).count(), 1)

    def test_missing_server_token_disables_setup(self):
        with patch.dict("os.environ", {"BUBLLIO_SETUP_TOKEN": ""}):
            self.assertEqual(self.client.get(self.url).data, {"available": False})
            self.assertEqual(self.client.post(self.url, self.payload, format="json").status_code, status.HTTP_403_FORBIDDEN)

    def test_short_server_token_disables_setup(self):
        with patch.dict("os.environ", {"BUBLLIO_SETUP_TOKEN": "too-short"}):
            self.assertEqual(self.client.get(self.url).data, {"available": False})
            self.assertEqual(self.client.post(self.url, self.payload, format="json").status_code, status.HTTP_403_FORBIDDEN)

    def test_wrong_token_creates_nothing(self):
        response = self.client.post(self.url, {**self.payload, "setup_token": "wrong"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(get_user_model().objects.exists())
        self.assertFalse(Organization.objects.exists())

    def test_creates_admin_owner_and_workspace_once(self):
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(username="first-admin")
        organization = Organization.objects.get(slug="nerds-lab")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password(self.payload["password"]))
        self.assertTrue(OrganizationMembership.objects.filter(user=user, organization=organization, role="owner").exists())
        self.assertFalse(Organization.objects.filter(personal_owner=user).exists())
        self.assertTrue(OrganizationSettings.objects.filter(organization=organization).exists())
        self.assertIsNotNone(InstallationState.objects.get(pk=1).completed_at)
        self.assertEqual(self.client.get(self.url).data, {"available": False})
        self.assertEqual(self.client.post(self.url, self.payload, format="json").status_code, status.HTTP_403_FORBIDDEN)
        user.delete()
        self.assertEqual(self.client.get(self.url).data, {"available": False})

    def test_weak_password_does_not_consume_setup(self):
        response = self.client.post(self.url, {**self.payload, "password": "password"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertTrue(self.client.get(self.url).data["available"])

    def test_optional_smtp_uses_existing_encrypted_account_model(self):
        key = Fernet.generate_key().decode()
        smtp = {
            "name": "Primary",
            "host": "smtp.example.com",
            "port": 587,
            "username": "mailer",
            "password": "smtp-secret",
            "from_email": "hello@example.com",
            "use_tls": True,
            "use_ssl": False,
            "is_default": True,
        }
        with patch.dict("os.environ", {"BUBLLIO_EMAIL_ENCRYPTION_KEY": key}):
            response = self.client.post(self.url, {**self.payload, "smtp": smtp}, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            account = EmailAccount.objects.get()
            self.assertEqual(account.organization.slug, "nerds-lab")
            self.assertNotIn("smtp-secret", account.encrypted_password)
            self.assertEqual(decrypt_secret(account.encrypted_password), "smtp-secret")

    def test_admin_can_view_and_replace_installation_fallback_smtp(self):
        key = Fernet.generate_key().decode()
        smtp = {
            "name": "Primary",
            "host": "smtp.example.com",
            "port": 587,
            "username": "mailer",
            "password": "smtp-secret",
            "from_email": "hello@example.com",
            "use_tls": True,
            "use_ssl": False,
            "is_default": True,
        }
        with patch.dict("os.environ", {"BUBLLIO_EMAIL_ENCRYPTION_KEY": key}):
            self.assertEqual(self.client.post(self.url, {**self.payload, "smtp": smtp}, format="json").status_code, 201)
            admin = get_user_model().objects.get(username="first-admin")
            self.client.force_authenticate(admin)
            response = self.client.get(self.settings_url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["smtp"]["host"], "smtp.example.com")
            response = self.client.patch(
                self.settings_url,
                {**smtp, "host": "smtp.new.example.com", "password": "new-secret"},
                format="json",
            )
            self.assertEqual(response.status_code, 200)
            account = EmailAccount.objects.get()
            self.assertEqual(account.host, "smtp.new.example.com")
            self.assertEqual(decrypt_secret(account.encrypted_password), "new-secret")

    def test_smtp_without_encryption_key_cannot_create_partial_installation(self):
        with patch.dict("os.environ", {"BUBLLIO_EMAIL_ENCRYPTION_KEY": ""}):
            response = self.client.post(self.url, {**self.payload, "smtp": {
                "name": "Primary", "host": "smtp.example.com", "port": 587,
                "username": "mailer", "password": "smtp-secret", "from_email": "hello@example.com",
            }}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(get_user_model().objects.exists())
        self.assertFalse(Organization.objects.exists())

    def test_setup_test_email_uses_supplied_recipient_without_saving(self):
        smtp = {
            "name": "Primary", "host": "smtp.example.com", "port": 587,
            "username": "mailer", "password": "smtp-secret", "from_email": "hello@example.com",
            "use_tls": True, "use_ssl": False,
        }
        with patch("organizations.setup_views.send_setup_test_email") as send:
            response = self.client.post(
                self.smtp_test_url,
                {"setup_token": self.setup_token, "smtp": smtp, "recipient": "admin@example.com"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Test email sent. Check the recipient inbox.")
        send.assert_called_once()
        self.assertEqual(send.call_args.kwargs["recipient"], "admin@example.com")
        self.assertEqual(send.call_args.kwargs["smtp"]["password"], "smtp-secret")
        self.assertFalse(EmailAccount.objects.exists())
        self.assertFalse(get_user_model().objects.exists())

    def test_setup_test_email_helper_sends_message(self):
        smtp = {
            "host": "smtp.example.com", "port": 465, "username": "mailer",
            "password": "smtp-secret", "from_email": "hello@example.com",
            "from_name": "Bubllio", "use_tls": False, "use_ssl": True,
        }
        with patch("organizations.email_service.get_connection") as get_connection, patch(
            "organizations.email_service.EmailMessage"
        ) as message_class:
            message_class.return_value.send.return_value = 1
            send_setup_test_email(smtp=smtp, recipient="admin@example.com")
        get_connection.assert_called_once_with(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host="smtp.example.com", port=465, username="mailer",
            password="smtp-secret", use_tls=False, use_ssl=True,
            timeout=10, fail_silently=False,
        )
        message_class.assert_called_once_with(
            subject="Bubllio CRM setup test email",
            body="Your SMTP settings sent this test email successfully. You can finish setting up Bubllio CRM.",
            from_email="Bubllio <hello@example.com>",
            to=["admin@example.com"],
            connection=get_connection.return_value,
        )
        message_class.return_value.send.assert_called_once_with(fail_silently=False)

    def test_setup_test_email_rejects_zero_messages_sent(self):
        smtp = {
            "host": "smtp.example.com", "port": 587, "username": "mailer",
            "password": "smtp-secret", "from_email": "hello@example.com",
        }
        with patch("organizations.email_service.get_connection"), patch(
            "organizations.email_service.EmailMessage"
        ) as message_class:
            message_class.return_value.send.return_value = 0
            with self.assertRaises(RuntimeError):
                send_setup_test_email(smtp=smtp, recipient="admin@example.com")

    def test_setup_test_email_rejects_invalid_token_without_sending(self):
        with patch("organizations.setup_views.send_setup_test_email") as send:
            response = self.client.post(self.smtp_test_url, {"setup_token": "wrong"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        send.assert_not_called()

    def test_setup_test_email_validates_recipient(self):
        smtp = {
            "name": "Primary", "host": "smtp.example.com", "port": 587,
            "username": "mailer", "password": "smtp-secret", "from_email": "hello@example.com",
        }
        with patch("organizations.setup_views.send_setup_test_email") as send:
            response = self.client.post(
                self.smtp_test_url,
                {"setup_token": self.setup_token, "smtp": smtp, "recipient": "not-an-email"}, format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        send.assert_not_called()

    def test_setup_test_email_returns_generic_error_and_keeps_setup_open(self):
        smtp = {
            "name": "Primary", "host": "smtp.example.com", "port": 587,
            "username": "mailer", "password": "smtp-secret", "from_email": "hello@example.com",
        }
        with patch("organizations.setup_views.send_setup_test_email", side_effect=RuntimeError("secret-details")):
            response = self.client.post(
                self.smtp_test_url,
                {"setup_token": self.setup_token, "smtp": smtp, "recipient": "admin@example.com"}, format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertNotIn("secret-details", str(response.data))
        self.assertTrue(self.client.get(self.url).data["available"])

    def test_setup_test_email_closes_after_setup(self):
        self.assertEqual(self.client.post(self.url, self.payload, format="json").status_code, status.HTTP_201_CREATED)
        with patch("organizations.setup_views.send_setup_test_email") as send:
            response = self.client.post(self.smtp_test_url, {"setup_token": self.setup_token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        send.assert_not_called()

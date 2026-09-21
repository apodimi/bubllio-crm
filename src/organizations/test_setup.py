from unittest.mock import patch

from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .email_security import decrypt_secret
from .models import EmailAccount, InstallationState, Organization, OrganizationMembership, OrganizationSettings


class InstallationSetupTests(APITestCase):
    setup_token = "test-install-token-with-at-least-32-chars"

    def setUp(self):
        cache.clear()
        self.url = reverse("installation-setup")
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

    def test_smtp_without_encryption_key_cannot_create_partial_installation(self):
        with patch.dict("os.environ", {"BUBLLIO_EMAIL_ENCRYPTION_KEY": ""}):
            response = self.client.post(self.url, {**self.payload, "smtp": {
                "name": "Primary", "host": "smtp.example.com", "port": 587,
                "username": "mailer", "password": "smtp-secret", "from_email": "hello@example.com",
            }}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(get_user_model().objects.exists())
        self.assertFalse(Organization.objects.exists())

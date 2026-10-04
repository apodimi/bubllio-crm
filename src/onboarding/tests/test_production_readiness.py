from unittest.mock import patch

from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class ProductionReadinessTests(APITestCase):
    def setUp(self):
        self.url = reverse("installation-production-readiness")
        self.admin = get_user_model().objects.create_superuser(
            username="installation-admin",
            email="admin@example.com",
            password="password",
        )

    @override_settings(
        DEBUG=False,
        SECRET_KEY="a-production-secret-with-more-than-fifty-unique-characters-1234567890",
        ALLOWED_HOSTS=["crm.example.com", "testserver"],
        BUBLLIO_APP_URL="https://crm.example.com",
        SECURE_SSL_REDIRECT=True,
        SESSION_COOKIE_SECURE=True,
        CSRF_COOKIE_SECURE=True,
        SECURE_HSTS_SECONDS=31536000,
        SECURE_HSTS_INCLUDE_SUBDOMAINS=True,
        SECURE_HSTS_PRELOAD=True,
    )
    def test_admin_sees_ready_status_without_secret_values(self):
        self.client.force_authenticate(self.admin)
        encryption_key = Fernet.generate_key().decode()
        with patch.dict("os.environ", {"BUBLLIO_EMAIL_ENCRYPTION_KEY": encryption_key}):
            response = self.client.get(self.url, secure=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ready"])
        self.assertEqual(response.data["passed"], response.data["total"])
        self.assertEqual(
            [check["key"] for check in response.data["checks"]],
            [
                "debug_disabled",
                "secret_key",
                "allowed_hosts",
                "public_url_https",
                "https_redirect",
                "secure_session_cookie",
                "secure_csrf_cookie",
                "hsts",
                "hsts_subdomains",
                "hsts_preload",
                "email_encryption_key",
            ],
        )
        rendered = str(response.data)
        self.assertNotIn("a-production-secret", rendered)
        self.assertNotIn(encryption_key, rendered)

    @override_settings(
        DEBUG=True,
        SECRET_KEY="django-insecure-local-development-key",
        ALLOWED_HOSTS=["*"],
        BUBLLIO_APP_URL="http://127.0.0.1:5173",
        SECURE_SSL_REDIRECT=False,
        SESSION_COOKIE_SECURE=False,
        CSRF_COOKIE_SECURE=False,
        SECURE_HSTS_SECONDS=0,
        SECURE_HSTS_INCLUDE_SUBDOMAINS=False,
        SECURE_HSTS_PRELOAD=False,
    )
    def test_unsafe_configuration_returns_actionable_failed_checks(self):
        self.client.force_authenticate(self.admin)
        with patch.dict("os.environ", {"BUBLLIO_EMAIL_ENCRYPTION_KEY": ""}):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["ready"])
        self.assertEqual(response.data["passed"], 0)
        self.assertEqual(response.data["total"], 11)
        self.assertTrue(all(check["status"] == "fail" for check in response.data["checks"]))
        self.assertTrue(all(check["guidance"] for check in response.data["checks"]))

    def test_regular_user_cannot_read_installation_diagnostics(self):
        user = get_user_model().objects.create_user(username="member", password="password")
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

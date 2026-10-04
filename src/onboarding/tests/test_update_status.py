import json
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class GitHubResponse(BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()


@override_settings(
    BUBLLIO_UPDATE_CHECK_ENABLED=True,
    BUBLLIO_UPDATE_REPOSITORY="apodimi/bubllio-crm-api",
    BUBLLIO_UPDATE_CHECK_TTL=21600,
)
class InstallationUpdateStatusTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("installation-update-status")
        self.admin = get_user_model().objects.create_superuser(
            username="installation-admin",
            email="admin@example.com",
            password="password",
        )

    def test_installation_admin_sees_available_github_release(self):
        self.client.force_authenticate(self.admin)
        release = {
            "tag_name": "v0.2.0",
            "name": "Bubllio CRM 0.2.0",
            "published_at": "2026-10-04T10:00:00Z",
        }
        with patch("onboarding.services.update_checker.current_version", return_value="0.1.0"), patch(
            "onboarding.services.update_checker.urlopen",
            return_value=GitHubResponse(json.dumps(release).encode()),
        ):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "status": "ok",
                "enabled": True,
                "current_version": "0.1.0",
                "latest_version": "0.2.0",
                "update_available": True,
                "release_name": "Bubllio CRM 0.2.0",
                "release_url": "https://github.com/apodimi/bubllio-crm-api/releases/tag/v0.2.0",
                "published_at": "2026-10-04T10:00:00Z",
            },
        )

    def test_regular_user_cannot_read_installation_update_status(self):
        user = get_user_model().objects.create_user(username="member", password="password")
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_github_failure_is_fail_open(self):
        self.client.force_authenticate(self.admin)
        with patch("onboarding.services.update_checker.current_version", return_value="0.1.0"), patch(
            "onboarding.services.update_checker.urlopen",
            side_effect=TimeoutError,
        ):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "unavailable")
        self.assertEqual(response.data["current_version"], "0.1.0")
        self.assertFalse(response.data["update_available"])
        self.assertIsNone(response.data["latest_version"])
        self.assertNotIn("error", response.data)

    def test_successful_result_is_cached(self):
        self.client.force_authenticate(self.admin)
        release = {
            "tag_name": "v0.1.0",
            "name": "Bubllio CRM 0.1.0",
            "published_at": "2026-10-01T10:00:00Z",
        }
        with patch("onboarding.services.update_checker.current_version", return_value="0.1.0"), patch(
            "onboarding.services.update_checker.urlopen",
            return_value=GitHubResponse(json.dumps(release).encode()),
        ) as fetch:
            first = self.client.get(self.url)
            second = self.client.get(self.url)

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(fetch.call_count, 1)
        self.assertFalse(second.data["update_available"])

    @override_settings(BUBLLIO_UPDATE_CHECK_ENABLED=False)
    def test_disabled_check_does_not_contact_github(self):
        self.client.force_authenticate(self.admin)
        with patch("onboarding.services.update_checker.current_version", return_value="0.1.0"), patch(
            "onboarding.services.update_checker.urlopen",
        ) as fetch:
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "disabled")
        self.assertFalse(response.data["enabled"])
        fetch.assert_not_called()

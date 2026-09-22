from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile


class UserProfileTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="member", email="member@example.com", password="test-pass"
        )
        self.client.force_authenticate(self.user)

    def test_profile_is_created_on_first_read(self):
        response = self.client.get(reverse("current-user-profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "member@example.com")
        self.assertFalse(response.data["onboarding_completed_at"])

    def test_profile_patch_completes_personal_onboarding(self):
        response = self.client.patch(
            reverse("current-user-profile"),
            {
                "display_name": "Maria Example",
                "first_name": "Maria",
                "last_name": "Example",
                "date_of_birth": "1990-05-12",
                "timezone": "Europe/Athens",
                "locale": "en-us",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["onboarding_completed_at"])
        self.assertEqual(UserProfile.objects.get(user=self.user).display_name, "Maria Example")

    def test_account_settings_updates_email_and_profile(self):
        response = self.client.patch(
            reverse("current-account-settings"),
            {"email": "new@example.com", "display_name": "Maria Example"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "new@example.com")
        self.assertEqual(self.user.profile.display_name, "Maria Example")

    def test_authenticated_user_can_change_password(self):
        response = self.client.post(
            reverse("password-change"),
            {"current_password": "test-pass", "new_password": "new-strong-password-4938"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-strong-password-4938"))

    @patch("accounts.views.send_mail")
    def test_password_reset_request_is_generic_and_sends_link(self, send_mail):
        response = self.client.post(
            reverse("password-reset-request"),
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("If an account exists", response.data["detail"])
        send_mail.assert_called_once()

    def test_password_reset_confirm_changes_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            reverse("password-reset-confirm", kwargs={"uidb64": uid, "token": token}),
            {"new_password": "reset-strong-password-4938"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("reset-strong-password-4938"))

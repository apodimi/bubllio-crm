from django.contrib.auth import get_user_model
from django.urls import reverse
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

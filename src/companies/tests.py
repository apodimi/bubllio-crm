from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, OrganizationMembership

from .models import Company


User = get_user_model()


class CompanyTenantAccessTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="member")
        self.other_user = User.objects.create_user(username="other")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        self.other_organization = Organization.objects.create(name="Other", slug="other")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.user,
            role=OrganizationMembership.Role.MEMBER,
        )
        OrganizationMembership.objects.create(
            organization=self.other_organization,
            user=self.other_user,
            role=OrganizationMembership.Role.OWNER,
        )
        Company.objects.create(organization=self.organization, name="Visible Company")
        Company.objects.create(organization=self.other_organization, name="Hidden Company")

    def url(self, organization=None):
        return reverse(
            "company-list",
            kwargs={"organization_id": (organization or self.organization).id},
        )

    def test_member_lists_only_companies_in_selected_organization(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data], ["Visible Company"])

    def test_member_can_create_company_without_organization_in_body(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url(), {"name": "Acme"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["organization"], self.organization.id)

    def test_user_cannot_access_another_organization(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url(self.other_organization))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_viewer_can_read_but_cannot_create(self):
        viewer = User.objects.create_user(username="viewer")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        self.client.force_authenticate(viewer)
        self.assertEqual(self.client.get(self.url()).status_code, status.HTTP_200_OK)
        denied = self.client.post(self.url(), {"name": "Denied"}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)

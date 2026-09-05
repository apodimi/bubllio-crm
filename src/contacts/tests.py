from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from organizations.models import Organization, OrganizationMembership

from .models import Contact


class ContactTenantAccessTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="member")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        self.other_organization = Organization.objects.create(name="Other", slug="other")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.user,
            role=OrganizationMembership.Role.MEMBER,
        )
        self.company = Company.objects.create(organization=self.organization, name="Acme")
        self.other_company = Company.objects.create(
            organization=self.other_organization, name="Other Company"
        )
        Contact.objects.create(
            organization=self.organization, company=self.company, first_name="Maria"
        )

    def url(self):
        return reverse("contact-list", kwargs={"organization_id": self.organization.id})

    def test_contact_list_is_scoped_to_organization(self):
        Contact.objects.create(
            organization=self.other_organization,
            company=self.other_company,
            first_name="Hidden",
        )
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["first_name"] for item in response.data], ["Maria"])

    def test_company_must_belong_to_url_organization(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url(),
            {"company": str(self.other_company.id), "first_name": "Invalid"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", response.data)

    def test_create_assigns_organization_from_url(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url(), {"company": str(self.company.id), "first_name": "Nikos"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["organization"], self.organization.id)

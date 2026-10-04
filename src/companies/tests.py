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

    def detail_url(self, company, organization=None):
        return reverse(
            "company-detail",
            kwargs={
                "organization_id": (organization or self.organization).id,
                "company_id": company.id,
            },
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

    def test_member_can_retrieve_and_update_company(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)

        retrieved = self.client.get(self.detail_url(company))
        updated = self.client.patch(
            self.detail_url(company),
            {"name": "Visible Partner", "lifecycle_stage": "customer"},
            format="json",
        )

        self.assertEqual(retrieved.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        company.refresh_from_db()
        self.assertEqual(company.name, "Visible Partner")
        self.assertEqual(company.lifecycle_stage, Company.LifecycleStage.CUSTOMER)

    def test_member_can_delete_company(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)

        response = self.client.delete(self.detail_url(company))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Company.objects.filter(id=company.id).exists())

    def test_company_detail_is_scoped_to_url_organization(self):
        hidden = Company.objects.get(name="Hidden Company")
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.detail_url(hidden),
            {"name": "Stolen"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        hidden.refresh_from_db()
        self.assertEqual(hidden.name, "Hidden Company")

    def test_viewer_can_retrieve_but_cannot_update_or_delete_company(self):
        company = Company.objects.get(name="Visible Company")
        viewer = User.objects.create_user(username="detail-viewer")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        self.client.force_authenticate(viewer)

        self.assertEqual(self.client.get(self.detail_url(company)).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.patch(self.detail_url(company), {"name": "Denied"}).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(self.detail_url(company)).status_code,
            status.HTTP_404_NOT_FOUND,
        )

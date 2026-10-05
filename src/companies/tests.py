from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, OrganizationMembership

from .models import Company, CompanyActivity


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

    def action_url(self, company, action):
        return reverse(
            f"company-{action}",
            kwargs={"organization_id": self.organization.id, "company_id": company.id},
        )

    def test_member_lists_only_companies_in_selected_organization(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data], ["Visible Company"])

    def test_member_can_create_company_without_organization_in_body(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url(),
            {
                "name": "Acme",
                "tax_id": "EL123456789",
                "industry": "Technology",
                "address_line_1": "1 Market Street",
                "city": "Athens",
                "postal_code": "105 63",
                "country": "gr",
                "notes": "Priority account",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["organization"], self.organization.id)
        self.assertEqual(response.data["country"], "GR")
        self.assertEqual(response.data["tax_id"], "EL123456789")
        self.assertEqual(response.data["customer_code"], "CUS-00002")
        self.assertTrue(
            CompanyActivity.objects.filter(
                company_id=response.data["id"],
                action=CompanyActivity.Action.CREATED,
                actor=self.user,
            ).exists()
        )

    def test_customer_codes_are_sequential_per_organization(self):
        self.client.force_authenticate(self.user)

        first = self.client.post(self.url(), {"name": "First"}, format="json")
        second = self.client.post(self.url(), {"name": "Second"}, format="json")

        self.assertEqual(first.data["customer_code"], "CUS-00002")
        self.assertEqual(second.data["customer_code"], "CUS-00003")

    def test_assignee_must_belong_to_selected_organization(self):
        self.client.force_authenticate(self.user)

        accepted = self.client.post(
            self.url(), {"name": "Owned", "assigned_to": self.user.id}, format="json"
        )
        rejected = self.client.post(
            self.url(), {"name": "Wrong owner", "assigned_to": self.other_user.id}, format="json"
        )

        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
        self.assertEqual(accepted.data["assigned_to_name"], "member")
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assigned_to", rejected.data)

    def test_duplicate_tax_id_and_email_are_rejected_within_workspace(self):
        Company.objects.create(
            organization=self.organization,
            name="Existing",
            tax_id="EL123",
            email="billing@example.com",
        )
        self.client.force_authenticate(self.user)

        by_tax = self.client.post(
            self.url(), {"name": "Duplicate tax", "tax_id": "el123"}, format="json"
        )
        by_email = self.client.post(
            self.url(), {"name": "Duplicate email", "email": "BILLING@example.com"}, format="json"
        )

        self.assertEqual(by_tax.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tax_id", by_tax.data)
        self.assertEqual(by_email.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", by_email.data)

    def test_company_search_includes_business_profile_fields(self):
        Company.objects.create(
            organization=self.organization,
            name="Tax Search",
            tax_id="EL99887766",
            industry="Hospitality",
            city="Thessaloniki",
        )
        self.client.force_authenticate(self.user)

        by_tax = self.client.get(self.url(), {"search": "998877"})
        by_industry = self.client.get(self.url(), {"search": "hospital"})
        by_city = self.client.get(self.url(), {"search": "thess"})

        self.assertEqual([item["name"] for item in by_tax.data], ["Tax Search"])
        self.assertEqual([item["name"] for item in by_industry.data], ["Tax Search"])
        self.assertEqual([item["name"] for item in by_city.data], ["Tax Search"])

    def test_company_list_filters_by_lifecycle_stage(self):
        Company.objects.create(
            organization=self.organization,
            name="Current Customer",
            lifecycle_stage=Company.LifecycleStage.CUSTOMER,
        )
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url(), {"lifecycle_stage": "customer"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data], ["Current Customer"])

    def test_company_list_rejects_invalid_lifecycle_stage(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url(), {"lifecycle_stage": "unknown"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_company_rejects_invalid_country_code(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.url(), {"name": "Invalid Country", "country": "Greece"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("country", response.data)

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

    def test_company_can_be_archived_filtered_and_restored(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)

        archived = self.client.post(self.action_url(company, "archive"))
        active_list = self.client.get(self.url())
        archived_list = self.client.get(self.url(), {"archived": "archived"})
        restored = self.client.post(self.action_url(company, "restore"))

        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(archived.data["archived_at"])
        self.assertEqual(active_list.data, [])
        self.assertEqual([item["id"] for item in archived_list.data], [str(company.id)])
        self.assertIsNone(restored.data["archived_at"])
        self.assertEqual(
            list(company.activities.values_list("action", flat=True)),
            [CompanyActivity.Action.RESTORED, CompanyActivity.Action.ARCHIVED],
        )

    def test_activity_endpoint_records_changed_fields(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)
        self.client.patch(
            self.detail_url(company),
            {"assigned_to": self.user.id},
            format="json",
        )

        response = self.client.get(self.action_url(company, "activity"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["action"], CompanyActivity.Action.ASSIGNED)
        self.assertEqual(response.data[0]["details"]["fields"], ["assigned_to"])

    def test_viewer_cannot_archive_company(self):
        company = Company.objects.get(name="Visible Company")
        viewer = User.objects.create_user(username="archive-viewer")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        self.client.force_authenticate(viewer)

        response = self.client.post(self.action_url(company, "archive"))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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

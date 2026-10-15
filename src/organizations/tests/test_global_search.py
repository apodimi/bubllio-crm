from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from contacts.models import Contact
from deals.models import Deal
from organizations.models import (
    Organization,
    OrganizationMembership,
    OrganizationProvisioning,
)


class GlobalSearchApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.viewer = user_model.objects.create_user("search-viewer")
        self.outsider = user_model.objects.create_user("search-outsider")
        self.organization = Organization.objects.create(
            name="Athens workspace", slug="athens-search"
        )
        self.second_organization = Organization.objects.create(
            name="Patras workspace", slug="patras-search"
        )
        self.foreign_organization = Organization.objects.create(
            name="Foreign workspace", slug="foreign-search"
        )
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        OrganizationMembership.objects.create(
            organization=self.second_organization,
            user=self.viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        OrganizationMembership.objects.create(
            organization=self.foreign_organization,
            user=self.outsider,
            role=OrganizationMembership.Role.OWNER,
        )
        self.company = Company.objects.create(
            organization=self.organization,
            name="Acme Group",
            industry="Renewable energy",
        )
        self.second_company = Company.objects.create(
            organization=self.second_organization,
            name="Acme Partners",
        )
        self.contact = Contact.objects.create(
            organization=self.organization,
            company=self.company,
            first_name="Maria",
            last_name="Acme",
            job_title="Finance director",
        )
        self.deal = Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="Acme renewal",
            value="1250.00",
        )
        self.url = reverse("global-search")

    def test_authentication_is_required(self):
        response = self.client.get(self.url, {"q": "  Acme  "})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_viewer_searches_all_accessible_organizations(self):
        self.client.force_authenticate(self.viewer)

        response = self.client.get(self.url, {"q": "  Acme  "})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["query"], "Acme")
        self.assertEqual(response.data["count"], 4)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(response.data["page_size"], 20)
        self.assertEqual(
            {result["organization"]["id"] for result in response.data["results"]},
            {str(self.organization.id), str(self.second_organization.id)},
        )
        company_result = next(
            result
            for result in response.data["results"]
            if result["id"] == str(self.company.id)
        )
        self.assertEqual(
            set(company_result),
            {
                "type",
                "id",
                "display_name",
                "organization",
                "customer_code",
                "lifecycle_stage",
            },
        )
        contact_result = next(
            result
            for result in response.data["results"]
            if result["id"] == str(self.contact.id)
        )
        deal_result = next(
            result
            for result in response.data["results"]
            if result["id"] == str(self.deal.id)
        )
        self.assertEqual(
            contact_result["company"],
            {"id": str(self.company.id), "name": self.company.name},
        )
        self.assertEqual(contact_result["job_title"], "Finance director")
        self.assertEqual(deal_result["value"], "1250.00")
        self.assertEqual(deal_result["currency"], "EUR")

    def test_organization_filter_is_scoped_to_membership(self):
        self.client.force_authenticate(self.viewer)

        scoped = self.client.get(
            self.url,
            {"q": "Acme", "organization": self.organization.id},
        )
        forbidden = self.client.get(
            self.url,
            {"q": "Acme", "organization": self.foreign_organization.id},
        )

        self.assertEqual(scoped.status_code, status.HTTP_200_OK)
        self.assertEqual(scoped.data["count"], 3)
        self.assertTrue(
            all(
                result["organization"]["id"] == str(self.organization.id)
                for result in scoped.data["results"]
            )
        )
        self.assertEqual(forbidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_superuser_has_no_workspace_search_bypass(self):
        superuser = get_user_model().objects.create_superuser(
            "search-superuser", "search-superuser@example.com", "password"
        )
        self.client.force_authenticate(superuser)

        all_workspaces = self.client.get(self.url, {"q": "Acme"})
        selected_workspace = self.client.get(
            self.url,
            {"q": "Acme", "organization": self.organization.id},
        )

        self.assertEqual(all_workspaces.status_code, status.HTTP_200_OK)
        self.assertEqual(all_workspaces.data["count"], 0)
        self.assertEqual(all_workspaces.data["results"], [])
        self.assertEqual(selected_workspace.status_code, status.HTTP_404_NOT_FOUND)

    def test_provisioning_organization_is_excluded(self):
        pending = Organization.objects.create(name="Pending", slug="pending-search")
        OrganizationMembership.objects.create(
            organization=pending,
            user=self.viewer,
            role=OrganizationMembership.Role.OWNER,
        )
        OrganizationProvisioning.objects.create(
            organization=pending,
            creator=self.outsider,
            owner_email="owner@example.com",
        )
        Company.objects.create(organization=pending, name="Acme Pending")
        self.client.force_authenticate(self.viewer)

        response = self.client.get(self.url, {"q": "Acme"})
        selected = self.client.get(
            self.url,
            {"q": "Acme", "organization": pending.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            str(pending.id),
            {result["organization"]["id"] for result in response.data["results"]},
        )
        self.assertEqual(selected.status_code, status.HTTP_404_NOT_FOUND)

    def test_archived_records_and_notes_are_not_searchable(self):
        Company.objects.create(
            organization=self.organization,
            name="Acme archived",
            archived_at=timezone.now(),
        )
        Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="Acme archived deal",
            archived_at=timezone.now(),
        )
        Company.objects.create(
            organization=self.organization,
            name="Visible company",
            notes="secretneedle",
        )
        Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="Visible deal",
            notes="secretneedle",
        )
        self.client.force_authenticate(self.viewer)

        archived = self.client.get(self.url, {"q": "archived"})
        notes = self.client.get(self.url, {"q": "secretneedle"})

        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertEqual(archived.data["count"], 0)
        self.assertEqual(notes.status_code, status.HTTP_200_OK)
        self.assertEqual(notes.data["count"], 0)

    def test_types_and_pagination_are_applied_to_combined_results(self):
        self.client.force_authenticate(self.viewer)

        first_page = self.client.get(
            self.url,
            {"q": "Acme", "types": "company,deal", "page_size": 1},
        )
        second_page = self.client.get(
            self.url,
            {
                "q": "Acme",
                "types": "company,deal",
                "page": 2,
                "page_size": 1,
            },
        )

        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertEqual(first_page.data["count"], 3)
        self.assertEqual(len(first_page.data["results"]), 1)
        self.assertEqual(len(second_page.data["results"]), 1)
        self.assertNotEqual(
            first_page.data["results"][0]["id"],
            second_page.data["results"][0]["id"],
        )
        self.assertTrue(
            all(
                result["type"] in {"company", "deal"}
                for result in first_page.data["results"]
                + second_page.data["results"]
            )
        )

    def test_identity_matches_outrank_exact_display_titles(self):
        email_contact = Contact.objects.create(
            organization=self.organization,
            company=self.company,
            first_name="Email",
            last_name="Identity",
            email="winner@example.com",
        )
        Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="winner@example.com",
        )
        phone_company = Company.objects.create(
            organization=self.organization,
            name="Phone identity",
            phone_number="2105550199",
        )
        Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="2105550199",
        )
        self.client.force_authenticate(self.viewer)

        email_results = self.client.get(
            self.url,
            {"q": "WINNER@example.com"},
        ).data["results"]
        phone_results = self.client.get(
            self.url,
            {"q": "2105550199"},
        ).data["results"]

        self.assertEqual(email_results[0]["id"], str(email_contact.id))
        self.assertEqual(phone_results[0]["id"], str(phone_company.id))

    def test_relevance_remains_interleaved_across_page_boundaries(self):
        identity_company = Company.objects.create(
            organization=self.organization,
            name="Identity winner",
            customer_code="Needle 42",
        )
        exact_contact = Contact.objects.create(
            organization=self.organization,
            company=self.company,
            first_name="Needle",
            last_name="42",
        )
        prefix_deal = Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="Needle 42 expansion",
        )
        contains_company = Company.objects.create(
            organization=self.organization,
            name="Group Needle 42",
        )
        secondary_contact = Contact.objects.create(
            organization=self.organization,
            company=self.company,
            first_name="Secondary",
            last_name="Match",
            job_title="Needle 42",
        )
        self.client.force_authenticate(self.viewer)

        pages = [
            self.client.get(
                self.url,
                {"q": "Needle 42", "page": page, "page_size": 2},
            )
            for page in (1, 2, 3)
        ]

        self.assertTrue(
            all(response.status_code == status.HTTP_200_OK for response in pages)
        )
        self.assertTrue(all(response.data["count"] == 5 for response in pages))
        self.assertEqual(
            [result["id"] for response in pages for result in response.data["results"]],
            [
                str(identity_company.id),
                str(exact_contact.id),
                str(prefix_deal.id),
                str(contains_company.id),
                str(secondary_contact.id),
            ],
        )
        repeated_second_page = self.client.get(
            self.url,
            {"q": "Needle 42", "page": 2, "page_size": 2},
        )
        self.assertEqual(repeated_second_page.data["results"], pages[1].data["results"])

    def test_company_industry_and_city_are_not_searchable(self):
        Company.objects.create(
            organization=self.organization,
            name="Restricted secondary fields",
            industry="Unsearchableindustry",
            city="Unsearchablecity",
        )
        self.client.force_authenticate(self.viewer)

        by_industry = self.client.get(self.url, {"q": "Unsearchableindustry"})
        by_city = self.client.get(self.url, {"q": "Unsearchablecity"})

        self.assertEqual(by_industry.data["count"], 0)
        self.assertEqual(by_city.data["count"], 0)

    def test_invalid_query_parameters_return_bad_request(self):
        self.client.force_authenticate(self.viewer)

        invalid_params = {
            "missing query": {},
            "short query": {"q": "x"},
            "long query": {"q": "x" * 101},
            "unknown type": {"q": "Acme", "types": "task"},
            "zero page": {"q": "Acme", "page": 0},
            "large page size": {"q": "Acme", "page_size": 51},
            "invalid organization": {"q": "Acme", "organization": "invalid"},
        }

        for case, params in invalid_params.items():
            with self.subTest(case=case):
                response = self.client.get(self.url, params)
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                    response.data,
                )

        empty_types = self.client.get(f"{self.url}?q=Acme&types=")
        self.assertEqual(empty_types.status_code, status.HTTP_400_BAD_REQUEST)

from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, OrganizationMembership
from contacts.models import Contact
from activities.models import Task

from .models import Company, CompanyActivity, CompanyTimelineEvent


User = get_user_model()


class CompanyTenantAccessTests(APITestCase):
    def test_paginated_companies_and_summary_are_tenant_scoped(self):
        self.client.force_authenticate(self.user)
        Company.objects.create(organization=self.organization, name="Another")
        first = self.client.get(self.url(), {"page": 1, "page_size": 1})
        second = self.client.get(self.url(), {"page": 2, "page_size": 1})
        self.assertEqual(first.data["count"], 2)
        self.assertEqual(len(first.data["results"]), 1)
        self.assertNotEqual(first.data["results"][0]["id"], second.data["results"][0]["id"])
        filtered = self.client.get(self.url(), {"page": 1, "search": "Visible"})
        self.assertEqual(filtered.data["count"], 1)
        self.assertEqual(self.client.get(self.url(), {"page": 0}).status_code, 400)
        self.assertEqual(self.client.get(self.url(), {"page": 1, "page_size": 101}).status_code, 400)
        self.assertEqual(self.client.get(self.url(self.other_organization), {"page": 1}).status_code, 404)
        summary = reverse("crm-summary", kwargs={"organization_id": self.organization.id})
        self.assertEqual(self.client.get(summary).data, {"companies": 2, "contacts": 0})
        hidden = reverse("crm-summary", kwargs={"organization_id": self.other_organization.id})
        self.assertEqual(self.client.get(hidden).status_code, 404)

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

    def assignees_url(self, organization=None):
        return reverse(
            "company-assignee-list",
            kwargs={"organization_id": (organization or self.organization).id},
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
        self.assertTrue(
            CompanyTimelineEvent.objects.filter(
                company_id=response.data["id"],
                event_type=CompanyTimelineEvent.EventType.COMPANY_CREATED,
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

    def test_company_list_supports_strict_stable_ordering(self):
        Company.objects.create(organization=self.organization, name="Alpha")
        Company.objects.create(organization=self.organization, name="Zulu")
        first_tie = Company.objects.create(organization=self.organization, name="Same")
        second_tie = Company.objects.create(organization=self.organization, name="Same")
        self.client.force_authenticate(self.user)

        ascending = self.client.get(self.url(), {"ordering": "name"})
        descending = self.client.get(self.url(), {"ordering": "-name"})
        by_updated = self.client.get(self.url(), {"ordering": "-updated_at"})
        invalid = self.client.get(self.url(), {"ordering": "notes"})

        self.assertEqual(
            [item["name"] for item in ascending.data],
            ["Alpha", "Same", "Same", "Visible Company", "Zulu"],
        )
        self.assertEqual(
            [item["name"] for item in descending.data],
            ["Zulu", "Visible Company", "Same", "Same", "Alpha"],
        )
        tied_ids = [item["id"] for item in ascending.data if item["name"] == "Same"]
        self.assertEqual(tied_ids, sorted((str(first_tie.id), str(second_tie.id))))
        self.assertEqual(by_updated.status_code, status.HTTP_200_OK)
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ordering", invalid.data)

    def test_assignee_choices_require_manage_crm_and_are_tenant_scoped(self):
        viewer = User.objects.create_user(username="viewer")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        self.client.force_authenticate(viewer)
        self.assertEqual(
            self.client.get(self.assignees_url()).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(self.assignees_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item["id"] for item in response.data},
            {self.user.id, viewer.id},
        )
        self.assertNotIn(self.other_user.id, {item["id"] for item in response.data})
        self.assertTrue(all("role" not in item for item in response.data))

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

    def test_company_detail_accepts_customer_code_and_legacy_uuid(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)

        by_code = self.client.get(
            reverse(
                "company-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "company_id": company.customer_code,
                },
            )
        )
        by_uuid = self.client.get(self.detail_url(company))

        self.assertEqual(by_code.status_code, status.HTTP_200_OK)
        self.assertEqual(by_uuid.status_code, status.HTTP_200_OK)
        self.assertEqual(by_code.data["id"], by_uuid.data["id"])

    def test_customer_code_lookup_remains_tenant_scoped(self):
        hidden = Company.objects.get(name="Hidden Company")
        hidden.customer_code = "CUS-99999"
        hidden.save(update_fields=("customer_code",))
        self.client.force_authenticate(self.user)

        response = self.client.get(
            reverse(
                "company-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "company_id": hidden.customer_code,
                },
            )
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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

    def test_archiving_company_only_changes_company_record_visibility(self):
        company = Company.objects.get(name="Visible Company")
        contact = Contact.objects.create(
            organization=self.organization,
            company=company,
            first_name="Maria",
        )
        self.client.force_authenticate(self.user)

        archived = self.client.post(self.action_url(company, "archive"))
        contacts = self.client.get(
            reverse(
                "contact-list",
                kwargs={"organization_id": self.organization.id},
            ),
            {"company": company.id},
        )

        contact.refresh_from_db()
        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertIsNone(contact.archived_at)
        self.assertEqual([item["id"] for item in contacts.data], [str(contact.id)])

    def test_company_changes_roll_back_when_audit_recording_fails(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)

        with patch(
            "companies.services.record_company_activity",
            side_effect=RuntimeError("audit unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.patch(
                    self.detail_url(company),
                    {"name": "Should roll back"},
                    format="json",
                )
        company.refresh_from_db()
        self.assertEqual(company.name, "Visible Company")

        with patch(
            "companies.services.record_company_activity",
            side_effect=RuntimeError("audit unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(self.action_url(company, "archive"))
        company.refresh_from_db()
        self.assertIsNone(company.archived_at)

        self.client.post(self.action_url(company, "archive"))
        company.refresh_from_db()
        self.assertIsNotNone(company.archived_at)
        with patch(
            "companies.services.record_company_activity",
            side_effect=RuntimeError("audit unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(self.action_url(company, "restore"))
        company.refresh_from_db()
        self.assertIsNotNone(company.archived_at)

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

    def test_timeline_lists_events_and_creates_notes(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)
        record = CompanyTimelineEvent.objects.create(
            organization=self.organization,
            company=company,
            actor=self.user,
            category=CompanyTimelineEvent.Category.COMPANY,
            event_type=CompanyTimelineEvent.EventType.COMPANY_UPDATED,
            source_type="company",
            source_id=company.id,
            details={"fields": ["name"]},
        )

        created = self.client.post(
            self.action_url(company, "timeline"),
            {"body": "Customer asked for a proposal next week."},
            format="json",
        )
        listed = self.client.get(
            self.action_url(company, "timeline"),
            {"page": 1, "page_size": 1},
        )
        notes = self.client.get(
            self.action_url(company, "timeline"),
            {"category": "note"},
        )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["event_type"], "note.added")
        self.assertEqual(created.data["actor_name"], "member")
        self.assertEqual(listed.data["count"], 2)
        self.assertEqual(len(listed.data["results"]), 1)
        self.assertEqual(notes.data["count"], 1)
        self.assertEqual(notes.data["results"][0]["body"], created.data["body"])
        self.assertTrue(CompanyTimelineEvent.objects.filter(id=record.id).exists())

    def test_attention_lists_only_my_active_companies_without_open_follow_up(self):
        never_contacted = Company.objects.create(
            organization=self.organization,
            name="Needs First Contact",
            assigned_to=self.user,
        )
        contacted = Company.objects.create(
            organization=self.organization,
            name="Needs Next Step",
            assigned_to=self.user,
        )
        with_follow_up = Company.objects.create(
            organization=self.organization,
            name="Already Planned",
            assigned_to=self.user,
        )
        inactive = Company.objects.create(
            organization=self.organization,
            name="Inactive Account",
            assigned_to=self.user,
            lifecycle_stage=Company.LifecycleStage.INACTIVE,
        )
        CompanyTimelineEvent.objects.create(
            organization=self.organization,
            company=contacted,
            actor=self.user,
            category=CompanyTimelineEvent.Category.COMMUNICATION,
            event_type=CompanyTimelineEvent.EventType.COMMUNICATION_LOGGED,
            occurred_at=timezone.now() - timedelta(days=10),
        )
        Task.objects.create(
            organization=self.organization,
            company=with_follow_up,
            assigned_to=self.user,
            created_by=self.user,
            title="Planned call",
            due_at=timezone.now() + timedelta(days=1),
        )
        self.client.force_authenticate(self.user)

        response = self.client.get(
            reverse(
                "company-attention",
                kwargs={"organization_id": self.organization.id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["company"]["name"] for item in response.data],
            [never_contacted.name, contacted.name],
        )
        self.assertIsNone(response.data[0]["last_communication_at"])
        self.assertIsNotNone(response.data[1]["last_communication_at"])
        self.assertNotIn(with_follow_up.name, str(response.data))
        self.assertNotIn(inactive.name, str(response.data))

    def test_attention_is_tenant_scoped(self):
        hidden = Company.objects.get(name="Hidden Company")
        hidden.assigned_to = self.user
        hidden.save(update_fields=("assigned_to",))
        self.client.force_authenticate(self.user)

        response = self.client.get(
            reverse(
                "company-attention",
                kwargs={"organization_id": self.other_organization.id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_timeline_rejects_blank_notes_and_invalid_filters(self):
        company = Company.objects.get(name="Visible Company")
        self.client.force_authenticate(self.user)

        blank = self.client.post(
            self.action_url(company, "timeline"), {"body": "   "}, format="json"
        )
        invalid_category = self.client.get(
            self.action_url(company, "timeline"), {"category": "unknown"}
        )
        invalid_page = self.client.get(
            self.action_url(company, "timeline"), {"page": 0}
        )

        self.assertEqual(blank.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_category.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_page.status_code, status.HTTP_400_BAD_REQUEST)

    def test_timeline_logs_structured_communication_for_company_contact(self):
        company = Company.objects.get(name="Visible Company")
        contact = Contact.objects.create(
            organization=self.organization,
            company=company,
            first_name="Maria",
            last_name="Pappas",
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.action_url(company, "timeline"),
            {
                "kind": "call",
                "contact": contact.id,
                "outcome": "Proposal requested",
                "body": "Send the revised offer on Friday.",
                "occurred_at": "2030-01-02T10:30:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category"], "communication")
        self.assertEqual(response.data["event_type"], "communication.logged")
        self.assertEqual(response.data["source_type"], "contact")
        self.assertEqual(response.data["source_id"], str(contact.id))
        self.assertEqual(
            response.data["details"],
            {
                "kind": "call",
                "outcome": "Proposal requested",
                "contact_name": "Maria Pappas",
            },
        )
        self.assertEqual(response.data["occurred_at"], "2030-01-02T10:30:00Z")

    def test_timeline_rejects_communication_contact_from_another_company(self):
        company = Company.objects.get(name="Visible Company")
        other_company = Company.objects.create(
            organization=self.organization,
            name="Another Company",
        )
        contact = Contact.objects.create(
            organization=self.organization,
            company=other_company,
            first_name="Wrong",
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.action_url(company, "timeline"),
            {
                "kind": "email",
                "contact": contact.id,
                "outcome": "Should not be recorded",
                "body": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(
            CompanyTimelineEvent.objects.filter(
                company=company,
                event_type=CompanyTimelineEvent.EventType.COMMUNICATION_LOGGED,
            ).exists()
        )

    def test_timeline_rejects_communication_contact_from_another_tenant(self):
        company = Company.objects.get(name="Visible Company")
        hidden_company = Company.objects.get(name="Hidden Company")
        contact = Contact.objects.create(
            organization=self.other_organization,
            company=hidden_company,
            first_name="Hidden",
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.action_url(company, "timeline"),
            {
                "kind": "meeting",
                "contact": contact.id,
                "outcome": "Should not be recorded",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(
            CompanyTimelineEvent.objects.filter(
                company=company,
                event_type=CompanyTimelineEvent.EventType.COMMUNICATION_LOGGED,
            ).exists()
        )

    def test_timeline_is_tenant_scoped_and_viewer_cannot_add_notes(self):
        company = Company.objects.get(name="Visible Company")
        hidden = Company.objects.get(name="Hidden Company")
        viewer = User.objects.create_user(username="timeline-viewer")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=viewer,
            role=OrganizationMembership.Role.VIEWER,
        )
        self.client.force_authenticate(viewer)

        allowed = self.client.get(self.action_url(company, "timeline"))
        denied_write = self.client.post(
            self.action_url(company, "timeline"), {"body": "Denied"}, format="json"
        )
        hidden_read = self.client.get(self.action_url(hidden, "timeline"))

        self.assertEqual(allowed.status_code, status.HTTP_200_OK)
        self.assertEqual(denied_write.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(hidden_read.status_code, status.HTTP_404_NOT_FOUND)

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

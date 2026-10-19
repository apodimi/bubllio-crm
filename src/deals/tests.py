from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from activities.models import Task
from companies.models import Company, CompanyTimelineEvent
from contacts.models import Contact
from organizations.models import Organization, OrganizationMembership
from .models import Deal


class DealApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("seller")
        self.org = Organization.objects.create(name="Sales", slug="sales")
        self.other = Organization.objects.create(name="Other", slug="other-deals")
        OrganizationMembership.objects.create(organization=self.org, user=self.user, role="member")
        self.teammate = get_user_model().objects.create_user("teammate")
        OrganizationMembership.objects.create(organization=self.org, user=self.teammate, role="member")
        self.company = Company.objects.create(organization=self.org, name="Acme")
        self.contact = Contact.objects.create(organization=self.org, company=self.company, first_name="Maria")
        self.client.force_authenticate(self.user)

    def url(self):
        return reverse("deal-list", kwargs={"organization_id": self.org.id})

    def test_create_and_list_deal(self):
        response = self.client.post(self.url(), {"company": self.company.id, "contact": self.contact.id, "title": "Annual contract", "value": "12000.00", "currency": "EUR", "tax_rate": "24.00", "probability": 40, "stage": "qualified"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.get(self.url()).data[0]["company_name"], "Acme")
        self.assertEqual(response.data["net_value"], "12000.00")
        self.assertEqual(response.data["tax_value"], "2880.00")
        self.assertEqual(response.data["gross_value"], "14880.00")
        self.assertTrue(
            CompanyTimelineEvent.objects.filter(
                company=self.company,
                event_type=CompanyTimelineEvent.EventType.DEAL_CREATED,
                source_id=response.data["id"],
            ).exists()
        )

    def test_tax_inclusive_amount_is_split_correctly(self):
        response = self.client.post(self.url(), {"company": self.company.id, "title": "Tax inclusive", "value": "124.00", "tax_rate": "24.00", "amount_includes_tax": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["net_value"], "100.00")
        self.assertEqual(response.data["tax_value"], "24.00")
        self.assertEqual(response.data["gross_value"], "124.00")

    def test_cross_tenant_company_is_rejected(self):
        company = Company.objects.create(organization=self.other, name="Hidden")
        response = self.client.post(self.url(), {"company": company.id, "title": "Invalid"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lost_deal_requires_reason(self):
        response = self.client.post(self.url(), {"company": self.company.id, "title": "Lost", "stage": "lost"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_detail_is_tenant_scoped(self):
        company = Company.objects.create(organization=self.other, name="Hidden")
        deal = Deal.objects.create(organization=self.other, company=company, title="Hidden")
        response = self.client.get(reverse("deal-detail", kwargs={"organization_id": self.org.id, "deal_id": deal.id}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_move_deal_changes_stage_and_order(self):
        first = Deal.objects.create(organization=self.org, company=self.company, title="First", stage="proposal", sort_order=0)
        second = Deal.objects.create(organization=self.org, company=self.company, title="Second", stage="proposal", sort_order=1)
        moved = Deal.objects.create(organization=self.org, company=self.company, title="Moved", stage="lead")

        response = self.client.post(reverse("deal-move", kwargs={"organization_id": self.org.id, "deal_id": moved.id}), {"stage": "proposal", "position": 1}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["stage"], "proposal")
        self.assertEqual(response.data["sort_order"], 1)
        self.assertEqual(list(Deal.objects.filter(stage="proposal").order_by("sort_order").values_list("id", flat=True)), [first.id, moved.id, second.id])
        event = CompanyTimelineEvent.objects.get(source_id=moved.id)
        self.assertEqual(event.event_type, CompanyTimelineEvent.EventType.DEAL_STAGE_CHANGED)
        self.assertEqual(event.details["from_stage"], "lead")
        self.assertEqual(event.details["to_stage"], "proposal")

    def test_move_deal_validates_position(self):
        deal = Deal.objects.create(organization=self.org, company=self.company, title="Move")
        response = self.client.post(reverse("deal-move", kwargs={"organization_id": self.org.id, "deal_id": deal.id}), {"stage": "won", "position": -1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_move_to_lost_requires_existing_reason(self):
        deal = Deal.objects.create(organization=self.org, company=self.company, title="Move")
        response = self.client.post(reverse("deal-move", kwargs={"organization_id": self.org.id, "deal_id": deal.id}), {"stage": "lost", "position": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vat_rate_must_be_between_zero_and_one_hundred(self):
        response = self.client.post(self.url(), {"company": self.company.id, "title": "Invalid VAT", "tax_rate": "101.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def create_deal(self, title, **overrides):
        values = {"organization": self.org, "company": self.company, "title": title}
        values.update(overrides)
        return Deal.objects.create(**values)

    def deal_ids(self, **params):
        response = self.client.get(self.url(), params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {item["id"] for item in response.data}

    def test_list_filters_by_owner_and_unassigned(self):
        mine = self.create_deal("Mine", assigned_to=self.user)
        teammate = self.create_deal("Teammate", assigned_to=self.teammate)
        unassigned = self.create_deal("Unassigned")

        self.assertEqual(self.deal_ids(assigned_to="me"), {str(mine.id)})
        self.assertEqual(
            self.deal_ids(assigned_to=str(self.teammate.id)), {str(teammate.id)}
        )
        self.assertEqual(
            self.deal_ids(assigned_to="unassigned"), {str(unassigned.id)}
        )

    def test_next_action_uses_only_incomplete_tenant_scoped_tasks(self):
        present = self.create_deal("Open task")
        completed_only = self.create_deal("Completed task")
        missing = self.create_deal("No task")
        due_at = timezone.now() + timedelta(days=1)
        Task.objects.create(
            organization=self.org,
            company=self.company,
            deal=present,
            title="Open",
            due_at=due_at,
            created_by=self.user,
        )
        Task.objects.create(
            organization=self.org,
            company=self.company,
            deal=present,
            title="Second open task",
            due_at=due_at + timedelta(days=1),
            created_by=self.user,
        )
        Task.objects.create(
            organization=self.org,
            company=self.company,
            deal=completed_only,
            title="Done",
            due_at=due_at,
            workflow_status=Task.WorkflowStatus.COMPLETED,
            completed_at=timezone.now(),
            completed_by=self.user,
            created_by=self.user,
        )

        self.assertEqual(self.deal_ids(next_action="present"), {str(present.id)})
        self.assertEqual(
            self.deal_ids(next_action="missing"),
            {str(completed_only.id), str(missing.id)},
        )

    def test_next_action_filters_exclude_won_and_lost_deals(self):
        open_missing = self.create_deal("Open missing", stage=Deal.Stage.PROPOSAL)
        open_present = self.create_deal("Open present", stage=Deal.Stage.NEGOTIATION)
        won = self.create_deal("Won", stage=Deal.Stage.WON)
        lost = self.create_deal(
            "Lost", stage=Deal.Stage.LOST, lost_reason="Chose another supplier"
        )
        due_at = timezone.now() + timedelta(days=1)
        for deal in (open_present, won, lost):
            Task.objects.create(
                organization=self.org,
                company=self.company,
                deal=deal,
                title=f"Follow up {deal.title}",
                due_at=due_at,
                created_by=self.user,
            )

        self.assertEqual(
            self.deal_ids(next_action="missing"), {str(open_missing.id)}
        )
        self.assertEqual(
            self.deal_ids(next_action="present"), {str(open_present.id)}
        )

    def test_expected_close_filters_are_inclusive_and_composable(self):
        first = self.create_deal(
            "First boundary",
            assigned_to=self.user,
            expected_close_date=date(2026, 10, 20),
        )
        last = self.create_deal(
            "Last boundary",
            assigned_to=self.user,
            expected_close_date=date(2026, 10, 31),
        )
        self.create_deal(
            "Outside", assigned_to=self.user, expected_close_date=date(2026, 11, 1)
        )
        self.create_deal(
            "Other owner",
            assigned_to=self.teammate,
            expected_close_date=date(2026, 10, 25),
        )

        self.assertEqual(
            self.deal_ids(
                assigned_to="me",
                expected_close_from="2026-10-20",
                expected_close_to="2026-10-31",
            ),
            {str(first.id), str(last.id)},
        )
        Task.objects.create(
            organization=self.org,
            company=self.company,
            deal=first,
            title="Boundary follow-up",
            due_at=timezone.now() + timedelta(days=1),
            created_by=self.user,
        )
        self.assertEqual(
            self.deal_ids(
                assigned_to="me",
                next_action="present",
                expected_close_from="2026-10-20",
                expected_close_to="2026-10-31",
            ),
            {str(first.id)},
        )

    def test_invalid_list_filters_return_bad_request(self):
        invalid_params = (
            {"assigned_to": "unknown"},
            {"assigned_to": "0"},
            {"next_action": "later"},
            {"expected_close_from": "not-a-date"},
            {
                "expected_close_from": "2026-11-01",
                "expected_close_to": "2026-10-01",
            },
            {"limit": "0"},
            {"limit": "101"},
            {"limit": "many"},
        )
        for params in invalid_params:
            with self.subTest(params=params):
                response = self.client.get(self.url(), params)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_limit_returns_the_deterministic_first_deals(self):
        first = self.create_deal("First", stage=Deal.Stage.LEAD, sort_order=0)
        second = self.create_deal("Second", stage=Deal.Stage.LEAD, sort_order=1)
        self.create_deal("Third", stage=Deal.Stage.LEAD, sort_order=2)

        response = self.client.get(self.url(), {"limit": 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data],
            [str(first.id), str(second.id)],
        )

    def test_limit_composes_with_filters(self):
        first = self.create_deal(
            "First mine", assigned_to=self.user, stage=Deal.Stage.LEAD, sort_order=0
        )
        self.create_deal(
            "Second mine", assigned_to=self.user, stage=Deal.Stage.LEAD, sort_order=1
        )
        self.create_deal(
            "Teammate",
            assigned_to=self.teammate,
            stage=Deal.Stage.LEAD,
            sort_order=0,
        )

        response = self.client.get(
            self.url(), {"assigned_to": "me", "limit": 1}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [str(first.id)])

    def test_filters_do_not_leak_cross_tenant_members_deals_or_tasks(self):
        outsider = get_user_model().objects.create_user("outsider")
        OrganizationMembership.objects.create(
            organization=self.other, user=outsider, role="member"
        )
        hidden_company = Company.objects.create(organization=self.other, name="Hidden")
        hidden_deal = Deal.objects.create(
            organization=self.other,
            company=hidden_company,
            title="Hidden",
            assigned_to=outsider,
        )
        Task.objects.create(
            organization=self.other,
            company=hidden_company,
            deal=hidden_deal,
            title="Hidden task",
            due_at=timezone.now() + timedelta(days=1),
            created_by=outsider,
        )
        visible = self.create_deal("Visible")

        invalid_owner = self.client.get(self.url(), {"assigned_to": outsider.id})
        self.assertEqual(invalid_owner.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.deal_ids(next_action="missing"), {str(visible.id)})

    def test_list_without_new_filters_keeps_legacy_response(self):
        active = self.create_deal("Active", stage=Deal.Stage.QUALIFIED)
        archived = self.create_deal("Archived", archived_at=timezone.now())

        response = self.client.get(self.url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual({item["id"] for item in response.data}, {str(active.id)})
        self.assertNotIn(str(archived.id), {item["id"] for item in response.data})

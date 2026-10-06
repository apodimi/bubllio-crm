from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from contacts.models import Contact
from deals.models import Deal
from organizations.models import Organization, OrganizationMembership
from onboarding.services.data_export import build_workspace_data_export

from .models import Task


class TaskApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user("operator")
        self.teammate = user_model.objects.create_user("teammate")
        self.outsider = user_model.objects.create_user("outsider")
        self.organization = Organization.objects.create(name="Workspace", slug="workspace-tasks")
        self.other_organization = Organization.objects.create(name="Other", slug="other-tasks")
        OrganizationMembership.objects.create(
            organization=self.organization, user=self.user, role="member"
        )
        OrganizationMembership.objects.create(
            organization=self.organization, user=self.teammate, role="member"
        )
        OrganizationMembership.objects.create(
            organization=self.other_organization, user=self.outsider, role="member"
        )
        self.company = Company.objects.create(
            organization=self.organization, name="Customer"
        )
        self.contact = Contact.objects.create(
            organization=self.organization,
            company=self.company,
            first_name="Alex",
        )
        self.deal = Deal.objects.create(
            organization=self.organization, company=self.company, title="Renewal"
        )
        self.other_company = Company.objects.create(
            organization=self.other_organization, name="Hidden"
        )
        self.client.force_authenticate(self.user)

    def list_url(self):
        return reverse("task-list", kwargs={"organization_id": self.organization.id})

    def create_task(self, **overrides):
        values = {
            "organization": self.organization,
            "company": self.company,
            "title": "Follow up",
            "due_at": timezone.now() + timedelta(days=1),
            "created_by": self.user,
        }
        values.update(overrides)
        return Task.objects.create(**values)

    def test_create_task_with_relationships_and_owner(self):
        due_at = timezone.now() + timedelta(days=2)
        response = self.client.post(
            self.list_url(),
            {
                "company": self.company.id,
                "contact": self.contact.id,
                "deal": self.deal.id,
                "assigned_to": self.teammate.id,
                "title": "Prepare renewal call",
                "kind": "call",
                "priority": "high",
                "due_at": due_at.isoformat(),
                "reminder_at": (due_at - timedelta(hours=2)).isoformat(),
                "notes": "Review the current agreement.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["company_name"], "Customer")
        self.assertEqual(response.data["contact_name"], "Alex")
        self.assertEqual(response.data["deal_title"], "Renewal")
        self.assertEqual(response.data["assigned_to"], self.teammate.id)
        self.assertEqual(response.data["effective_status"], "open")
        self.assertEqual(Task.objects.get().organization, self.organization)
        self.assertEqual(Task.objects.get().created_by, self.user)

    def test_cross_tenant_relationships_are_rejected(self):
        hidden_contact = Contact.objects.create(
            organization=self.other_organization,
            company=self.other_company,
            first_name="Hidden",
        )
        hidden_deal = Deal.objects.create(
            organization=self.other_organization,
            company=self.other_company,
            title="Hidden",
        )
        due_at = (timezone.now() + timedelta(days=1)).isoformat()

        for field, value in (
            ("company", self.other_company.id),
            ("contact", hidden_contact.id),
            ("deal", hidden_deal.id),
            ("assigned_to", self.outsider.id),
        ):
            payload = {
                "company": self.company.id,
                "title": "Invalid",
                "due_at": due_at,
                field: value,
            }
            response = self.client.post(self.list_url(), payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, field)

    def test_contact_and_deal_must_belong_to_selected_company(self):
        second_company = Company.objects.create(
            organization=self.organization, name="Second customer"
        )
        due_at = (timezone.now() + timedelta(days=1)).isoformat()

        contact_response = self.client.post(
            self.list_url(),
            {
                "company": second_company.id,
                "contact": self.contact.id,
                "title": "Wrong contact",
                "due_at": due_at,
            },
            format="json",
        )
        deal_response = self.client.post(
            self.list_url(),
            {
                "company": second_company.id,
                "deal": self.deal.id,
                "title": "Wrong deal",
                "due_at": due_at,
            },
            format="json",
        )

        self.assertEqual(contact_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(deal_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reminder_cannot_be_after_due_time(self):
        due_at = timezone.now() + timedelta(hours=1)
        response = self.client.post(
            self.list_url(),
            {
                "company": self.company.id,
                "title": "Invalid reminder",
                "due_at": due_at.isoformat(),
                "reminder_at": (due_at + timedelta(minutes=1)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reminder_at", response.data)

    def test_complete_and_reopen_task_preserve_record(self):
        task = self.create_task()
        complete_url = reverse(
            "task-complete",
            kwargs={"organization_id": self.organization.id, "task_id": task.id},
        )
        reopen_url = reverse(
            "task-reopen",
            kwargs={"organization_id": self.organization.id, "task_id": task.id},
        )

        completed = self.client.post(complete_url, {}, format="json")
        completed_again = self.client.post(complete_url, {}, format="json")
        reopened = self.client.post(reopen_url, {}, format="json")

        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.assertEqual(completed.data["effective_status"], "completed")
        self.assertEqual(completed.data["completed_by_name"], "operator")
        self.assertEqual(
            completed.data["completed_at"], completed_again.data["completed_at"]
        )
        self.assertEqual(reopened.data["effective_status"], "open")
        self.assertIsNone(reopened.data["completed_at"])
        self.assertEqual(Task.objects.filter(id=task.id).count(), 1)

    def test_buckets_and_owner_filter(self):
        overdue = self.create_task(
            title="Overdue", assigned_to=self.user, due_at=timezone.now() - timedelta(days=1)
        )
        self.create_task(
            title="Upcoming", assigned_to=self.teammate, due_at=timezone.now() + timedelta(days=2)
        )
        completed = self.create_task(title="Completed", assigned_to=self.user)
        completed.completed_at = timezone.now()
        completed.completed_by = self.user
        completed.save(update_fields=("completed_at", "completed_by"))

        overdue_response = self.client.get(
            self.list_url(), {"bucket": "overdue", "assigned_to": "me"}
        )
        completed_response = self.client.get(
            self.list_url(), {"bucket": "completed"}
        )

        self.assertEqual([item["id"] for item in overdue_response.data], [str(overdue.id)])
        self.assertEqual(
            [item["id"] for item in completed_response.data], [str(completed.id)]
        )

    def test_detail_and_actions_are_tenant_scoped(self):
        hidden = Task.objects.create(
            organization=self.other_organization,
            company=self.other_company,
            title="Hidden",
            due_at=timezone.now() + timedelta(days=1),
        )
        for route in ("task-detail", "task-complete", "task-reopen"):
            url = reverse(
                route,
                kwargs={"organization_id": self.organization.id, "task_id": hidden.id},
            )
            response = self.client.get(url) if route == "task-detail" else self.client.post(url, {})
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, route)

    def test_non_member_cannot_list_tasks(self):
        self.client.force_authenticate(self.outsider)
        response = self.client.get(self.list_url())
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_viewer_can_read_but_cannot_change_tasks(self):
        viewer = get_user_model().objects.create_user("viewer")
        OrganizationMembership.objects.create(
            organization=self.organization, user=viewer, role="viewer"
        )
        task = self.create_task()
        self.client.force_authenticate(viewer)

        self.assertEqual(self.client.get(self.list_url()).status_code, status.HTTP_200_OK)
        response = self.client.post(
            reverse(
                "task-complete",
                kwargs={"organization_id": self.organization.id, "task_id": task.id},
            ),
            {},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_workspace_export_includes_tasks_without_duplicating_names(self):
        task = self.create_task(
            contact=self.contact,
            deal=self.deal,
            assigned_to=self.teammate,
            notes="Bring the agreement.",
        )

        exported = build_workspace_data_export(self.organization)

        self.assertEqual(len(exported["tasks"]), 1)
        self.assertEqual(exported["tasks"][0]["id"], task.id)
        self.assertEqual(exported["tasks"][0]["company_id"], self.company.id)
        self.assertNotIn("company_name", exported["tasks"][0])

    def test_company_with_task_returns_conflict_instead_of_server_error(self):
        self.create_task()
        response = self.client.delete(
            reverse(
                "company-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "company_id": self.company.id,
                },
            )
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

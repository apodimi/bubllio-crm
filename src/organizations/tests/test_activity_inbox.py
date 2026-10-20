from datetime import timedelta
from uuid import UUID

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from activities.models import Task
from companies.models import Company
from deals.models import Deal
from organizations.models import Organization, OrganizationInvitation, OrganizationMembership


User = get_user_model()


class ActivityInboxTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="inbox-member")
        self.organization = Organization.objects.create(name="Inbox", slug="inbox")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.user,
            role=OrganizationMembership.Role.MEMBER,
        )
        self.client.force_authenticate(self.user)

    def url(self, organization=None):
        return reverse(
            "activity-inbox",
            kwargs={"organization_id": (organization or self.organization).id},
        )

    def test_personal_signals_are_ordered_and_company_is_deduplicated(self):
        company = Company.objects.create(
            organization=self.organization, name="Acme", assigned_to=self.user
        )
        deal = Deal.objects.create(
            organization=self.organization,
            company=company,
            assigned_to=self.user,
            title="Renewal",
        )
        task = Task.objects.create(
            organization=self.organization,
            company=company,
            assigned_to=self.user,
            title="Call Acme",
            due_at=timezone.now() - timedelta(days=1),
        )

        response = self.client.get(self.url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["items"]]
        self.assertEqual(ids[0], f"task:{task.id}")
        self.assertIn(f"deal:{deal.id}:next-action", ids)
        self.assertNotIn(f"company:{company.id}:follow-up", ids)
        self.assertEqual(response.data["count"], len(response.data["items"]))

    def test_cross_tenant_access_is_hidden(self):
        other = Organization.objects.create(name="Other", slug="inbox-other")
        self.assertEqual(self.client.get(self.url(other)).status_code, status.HTTP_404_NOT_FOUND)

    def test_pending_invitations_are_visible_only_to_member_managers(self):
        OrganizationInvitation.objects.create(
            organization=self.organization,
            email="pending@example.test",
            role=OrganizationMembership.Role.MEMBER,
            token_hash="a" * 64,
            invited_by=self.user,
            expires_at=timezone.now() + timedelta(days=1),
        )
        member_response = self.client.get(self.url())
        self.assertNotIn("pending_invitations", [item["kind"] for item in member_response.data["items"]])

        membership = OrganizationMembership.objects.get(organization=self.organization, user=self.user)
        membership.role = OrganizationMembership.Role.ADMIN
        membership.save(update_fields=("role", "updated_at"))
        admin_response = self.client.get(self.url())
        self.assertIn("pending_invitations", [item["kind"] for item in admin_response.data["items"]])

    def test_other_users_and_completed_tasks_are_not_returned(self):
        other_user = User.objects.create_user(username="another-member")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=other_user,
            role=OrganizationMembership.Role.MEMBER,
        )
        company = Company.objects.create(organization=self.organization, name="Shared")
        other_company = Company.objects.create(
            organization=self.organization,
            name="Other account",
            assigned_to=other_user,
        )
        Deal.objects.create(
            organization=self.organization,
            company=other_company,
            assigned_to=other_user,
            title="Other deal",
        )
        mine = Task.objects.create(
            organization=self.organization,
            company=company,
            assigned_to=self.user,
            title="Mine",
            due_at=timezone.now() - timedelta(hours=2),
        )
        Task.objects.create(
            organization=self.organization,
            company=company,
            assigned_to=other_user,
            title="Not mine",
            due_at=timezone.now() - timedelta(hours=3),
        )

        initial = self.client.get(self.url())
        self.assertIn(f"task:{mine.id}", [item["id"] for item in initial.data["items"]])
        self.assertNotIn("Not mine", str(initial.data))
        self.assertNotIn("Other account", str(initial.data))
        self.assertNotIn("Other deal", str(initial.data))

        mine.workflow_status = Task.WorkflowStatus.COMPLETED
        mine.completed_at = timezone.now()
        mine.completed_by = self.user
        mine.save(update_fields=("workflow_status", "completed_at", "completed_by", "updated_at"))
        resolved = self.client.get(self.url())
        self.assertNotIn(f"task:{mine.id}", [item["id"] for item in resolved.data["items"]])

    def test_same_severity_and_due_time_uses_stable_id_order(self):
        company = Company.objects.create(organization=self.organization, name="Ordered")
        due_at = timezone.now() - timedelta(days=1)
        later_id = UUID("ffffffff-ffff-4fff-8fff-ffffffffffff")
        earlier_id = UUID("00000000-0000-4000-8000-000000000001")
        for task_id, title in ((later_id, "Later ID"), (earlier_id, "Earlier ID")):
            Task.objects.create(
                id=task_id,
                organization=self.organization,
                company=company,
                assigned_to=self.user,
                title=title,
                due_at=due_at,
            )

        response = self.client.get(self.url())
        task_ids = [item["id"] for item in response.data["items"] if item["entity"]["type"] == "task"]
        self.assertEqual(task_ids, [f"task:{earlier_id}", f"task:{later_id}"])

    def test_response_is_bounded_to_fifty_items(self):
        Company.objects.bulk_create(
            [
                Company(
                    organization=self.organization,
                    assigned_to=self.user,
                    name=f"Company {index:02d}",
                    customer_code=f"BND-{index:05d}",
                )
                for index in range(51)
            ]
        )

        response = self.client.get(self.url())

        self.assertEqual(response.data["count"], 50)
        self.assertEqual(len(response.data["items"]), 50)

    def test_invitation_aggregation_ignores_large_resolved_history(self):
        now = timezone.now()
        OrganizationInvitation.objects.bulk_create(
            [
                OrganizationInvitation(
                    organization=self.organization,
                    email=f"history-{index}@example.test",
                    role=OrganizationMembership.Role.MEMBER,
                    token_hash=f"{index:064x}",
                    invited_by=self.user,
                    expires_at=now - timedelta(days=1),
                )
                for index in range(100)
            ]
        )
        OrganizationInvitation.objects.create(
            organization=self.organization,
            email="active@example.test",
            role=OrganizationMembership.Role.MEMBER,
            token_hash="f" * 64,
            invited_by=self.user,
            expires_at=now + timedelta(days=2),
        )
        membership = OrganizationMembership.objects.get(organization=self.organization, user=self.user)
        membership.role = OrganizationMembership.Role.ADMIN
        membership.save(update_fields=("role", "updated_at"))

        response = self.client.get(self.url())
        invitation = next(item for item in response.data["items"] if item["kind"] == "pending_invitations")
        self.assertEqual(invitation["description"], "1")

        membership.role = OrganizationMembership.Role.VIEWER
        membership.save(update_fields=("role", "updated_at"))
        viewer_response = self.client.get(self.url())
        self.assertNotIn("pending_invitations", [item["kind"] for item in viewer_response.data["items"]])

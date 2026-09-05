from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, OrganizationMembership

from .events import AutomationTrigger
from .models import Automation, AutomationRun


class AutomationTenantAccessTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username="admin")
        self.member = User.objects.create_user(username="member")
        self.other_user = User.objects.create_user(username="other")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        self.other_organization = Organization.objects.create(name="Other", slug="other")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.admin,
            role=OrganizationMembership.Role.ADMIN,
        )
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.member,
            role=OrganizationMembership.Role.MEMBER,
        )
        OrganizationMembership.objects.create(
            organization=self.other_organization,
            user=self.other_user,
            role=OrganizationMembership.Role.OWNER,
        )
        self.automation = Automation.objects.create(
            organization=self.organization,
            name="Notify accounting",
            trigger=AutomationTrigger.COMPANY_CREATED,
            action_type=Automation.ActionType.SEND_EMAIL,
            action_config={
                "to": ["accounting@example.com"],
                "subject": "New company",
                "body": "A company was created.",
            },
        )

    def list_url(self, organization=None):
        return reverse(
            "automation-list",
            kwargs={"organization_id": (organization or self.organization).id},
        )

    def test_member_can_list_but_cannot_create_automations(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(self.list_url()).status_code, status.HTTP_200_OK)
        denied = self.client.post(
            self.list_url(),
            {
                "name": "Denied",
                "trigger": "company.created",
                "action_type": "send_email",
                "action_config": {
                    "to": ["test@example.com"],
                    "subject": "Test",
                    "body": "Test",
                },
            },
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_create_automation_without_organization_in_body(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url(),
            {
                "name": "Welcome",
                "trigger": "company.created",
                "action_type": "send_email",
                "action_config": {
                    "to": ["test@example.com"],
                    "subject": "Test",
                    "body": "Test",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["organization"], self.organization.id)

    def test_run_list_does_not_leak_other_organization_runs(self):
        other_automation = Automation.objects.create(
            organization=self.other_organization,
            name="Other",
            trigger=AutomationTrigger.COMPANY_CREATED,
            action_type=Automation.ActionType.SEND_EMAIL,
            action_config={},
        )
        AutomationRun.objects.create(
            automation=self.automation,
            trigger=self.automation.trigger,
            status=AutomationRun.Status.SUCCESS,
        )
        AutomationRun.objects.create(
            automation=other_automation,
            trigger=other_automation.trigger,
            status=AutomationRun.Status.SUCCESS,
        )
        self.client.force_authenticate(self.member)
        response = self.client.get(
            reverse(
                "automation-run-list",
                kwargs={"organization_id": self.organization.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["automation"], self.automation.id)

    def test_automation_test_is_scoped_to_organization(self):
        self.client.force_authenticate(self.other_user)
        response = self.client.post(
            reverse(
                "automation-test",
                kwargs={
                    "organization_id": self.other_organization.id,
                    "automation_id": self.automation.id,
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

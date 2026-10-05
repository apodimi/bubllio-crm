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

    def detail_url(self, contact):
        return reverse(
            "contact-detail",
            kwargs={"organization_id": self.organization.id, "contact_id": contact.id},
        )

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

    def test_search_and_company_filter_are_server_side(self):
        other = Company.objects.create(organization=self.organization, name="Second")
        Contact.objects.create(
            organization=self.organization,
            company=other,
            first_name="Nikos",
            department="Finance",
        )
        self.client.force_authenticate(self.user)

        searched = self.client.get(self.url(), {"search": "finance"})
        filtered = self.client.get(self.url(), {"company": self.company.id})

        self.assertEqual([item["first_name"] for item in searched.data], ["Nikos"])
        self.assertEqual([item["first_name"] for item in filtered.data], ["Maria"])
        self.assertEqual(filtered.data[0]["company_name"], "Acme")

    def test_invalid_company_filter_is_rejected(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url(), {"company": "not-a-uuid"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["company"], ["Select a valid company."])

    def test_duplicate_email_is_rejected_inside_organization(self):
        Contact.objects.create(
            organization=self.organization,
            company=self.company,
            first_name="Existing",
            email="person@example.com",
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.url(),
            {
                "company": self.company.id,
                "first_name": "Duplicate",
                "email": "PERSON@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_member_can_retrieve_update_and_delete_contact(self):
        contact = Contact.objects.get(first_name="Maria")
        self.client.force_authenticate(self.user)

        retrieved = self.client.get(self.detail_url(contact))
        updated = self.client.patch(
            self.detail_url(contact),
            {"job_title": "Finance Director"},
            format="json",
        )
        deleted = self.client.delete(self.detail_url(contact))

        self.assertEqual(retrieved.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["job_title"], "Finance Director")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Contact.objects.filter(pk=contact.pk).exists())

    def test_contact_detail_is_tenant_scoped(self):
        hidden = Contact.objects.create(
            organization=self.other_organization,
            company=self.other_company,
            first_name="Hidden",
        )
        self.client.force_authenticate(self.user)

        response = self.client.get(self.detail_url(hidden))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_setting_primary_contact_replaces_previous_primary(self):
        existing = Contact.objects.get(first_name="Maria")
        existing.is_primary = True
        existing.save()
        replacement = Contact.objects.create(organization=self.organization, company=self.company, first_name="Nikos")
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.detail_url(replacement), {"is_primary": True}, format="json")

        existing.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_primary"])
        self.assertFalse(existing.is_primary)

    def test_archive_hides_contact_and_records_activity(self):
        contact = Contact.objects.get(first_name="Maria")
        self.client.force_authenticate(self.user)
        archive_url = reverse("contact-archive", kwargs={"organization_id": self.organization.id, "contact_id": contact.id})
        activity_url = reverse("contact-activity", kwargs={"organization_id": self.organization.id, "contact_id": contact.id})

        archived = self.client.post(archive_url)
        active_list = self.client.get(self.url())
        activity = self.client.get(activity_url)

        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertEqual(active_list.data, [])
        self.assertEqual(activity.data[0]["action"], "archived")

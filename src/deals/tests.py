from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from companies.models import Company
from contacts.models import Contact
from organizations.models import Organization, OrganizationMembership
from .models import Deal


class DealApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("seller")
        self.org = Organization.objects.create(name="Sales", slug="sales")
        self.other = Organization.objects.create(name="Other", slug="other-deals")
        OrganizationMembership.objects.create(organization=self.org, user=self.user, role="member")
        self.company = Company.objects.create(organization=self.org, name="Acme")
        self.contact = Contact.objects.create(organization=self.org, company=self.company, first_name="Maria")
        self.client.force_authenticate(self.user)

    def url(self):
        return reverse("deal-list", kwargs={"organization_id": self.org.id})

    def test_create_and_list_deal(self):
        response = self.client.post(self.url(), {"company": self.company.id, "contact": self.contact.id, "title": "Annual contract", "value": "12000.00", "currency": "EUR", "probability": 40, "stage": "qualified"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.get(self.url()).data[0]["company_name"], "Acme")

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

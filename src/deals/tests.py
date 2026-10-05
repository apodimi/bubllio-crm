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
        response = self.client.post(self.url(), {"company": self.company.id, "contact": self.contact.id, "title": "Annual contract", "value": "12000.00", "currency": "EUR", "tax_rate": "24.00", "probability": 40, "stage": "qualified"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.get(self.url()).data[0]["company_name"], "Acme")
        self.assertEqual(response.data["net_value"], "12000.00")
        self.assertEqual(response.data["tax_value"], "2880.00")
        self.assertEqual(response.data["gross_value"], "14880.00")

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

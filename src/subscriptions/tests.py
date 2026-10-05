from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from organizations.models import Organization, OrganizationMembership

from .models import Charge, CustomerSubscription, ServiceCatalogItem


class SubscriptionApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("billing-user")
        self.organization = Organization.objects.create(name="Main workspace", slug="main-workspace")
        self.other_organization = Organization.objects.create(name="Private workspace", slug="private-workspace")
        OrganizationMembership.objects.create(
            organization=self.organization, user=self.user, role="member"
        )
        self.company = Company.objects.create(
            organization=self.organization, name="Sample customer"
        )
        self.catalog_item = ServiceCatalogItem.objects.create(
            organization=self.organization,
            name="Managed hosting",
            default_net_price="100.00",
            default_tax_rate="24.00",
            billing_interval="monthly",
        )
        self.client.force_authenticate(self.user)

    def catalog_url(self):
        return reverse(
            "service-catalog-list", kwargs={"organization_id": self.organization.id}
        )

    def subscriptions_url(self):
        return reverse(
            "subscription-list", kwargs={"organization_id": self.organization.id}
        )

    def charges_url(self):
        return reverse("charge-list", kwargs={"organization_id": self.organization.id})

    def create_subscription(self, **overrides):
        payload = {
            "company": self.company.id,
            "catalog_item": self.catalog_item.id,
            "start_date": "2026-10-05",
            "next_billing_date": "2026-10-05",
        }
        payload.update(overrides)
        return self.client.post(self.subscriptions_url(), payload, format="json")

    def test_catalog_subscription_and_initial_charge_flow(self):
        response = self.create_subscription()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Managed hosting")
        self.assertEqual(response.data["gross_price"], "124.00")
        charge = Charge.objects.get(subscription_id=response.data["id"])
        self.assertEqual(charge.net_amount, 100)
        self.assertEqual(charge.tax_amount, 24)
        self.assertEqual(charge.gross_amount, 124)
        self.assertEqual(charge.coverage_end, date(2026, 11, 4))

    def test_custom_subscription_requires_commercial_fields(self):
        response = self.client.post(
            self.subscriptions_url(), {"company": self.company.id}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("net_price", response.data)

    def test_cross_tenant_relations_are_rejected(self):
        other_company = Company.objects.create(
            organization=self.other_organization, name="Hidden customer"
        )
        other_item = ServiceCatalogItem.objects.create(
            organization=self.other_organization, name="Hidden service"
        )

        company_response = self.create_subscription(company=other_company.id)
        catalog_response = self.create_subscription(catalog_item=other_item.id)

        self.assertEqual(company_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(catalog_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_partial_then_full_payment_creates_one_next_charge(self):
        subscription_response = self.create_subscription()
        charge = Charge.objects.get(subscription_id=subscription_response.data["id"])
        payment_url = reverse(
            "charge-payment-list",
            kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
        )

        partial = self.client.post(payment_url, {"amount": "40.00"}, format="json")
        after_partial = self.client.get(self.charges_url()).data[0]
        full = self.client.post(payment_url, {"amount": "84.00"}, format="json")

        self.assertEqual(partial.status_code, status.HTTP_201_CREATED)
        self.assertEqual(after_partial["payment_status"], "partially_paid")
        self.assertEqual(after_partial["outstanding_amount"], "84.00")
        self.assertEqual(full.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Charge.objects.filter(subscription_id=subscription_response.data["id"]).count(), 2)
        self.assertTrue(
            Charge.objects.filter(
                subscription_id=subscription_response.data["id"], due_date=date(2026, 11, 5)
            ).exists()
        )

    def test_overpayment_is_rejected_without_creating_payment(self):
        subscription_response = self.create_subscription()
        charge = Charge.objects.get(subscription_id=subscription_response.data["id"])
        payment_url = reverse(
            "charge-payment-list",
            kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
        )

        response = self.client.post(payment_url, {"amount": "125.00"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(charge.payments.count(), 0)

    def test_charge_and_payment_are_tenant_scoped(self):
        other_company = Company.objects.create(
            organization=self.other_organization, name="Hidden customer"
        )
        other_subscription = CustomerSubscription.objects.create(
            organization=self.other_organization,
            company=other_company,
            name="Hidden service",
            net_price="10.00",
            tax_rate="0.00",
            currency="EUR",
            billing_interval="monthly",
            start_date=date(2026, 10, 5),
            next_billing_date=date(2026, 10, 5),
        )
        hidden_charge = Charge.objects.create(
            organization=self.other_organization,
            subscription=other_subscription,
            coverage_start=date(2026, 10, 5),
            coverage_end=date(2026, 11, 4),
            due_date=date(2026, 10, 5),
            net_amount="10.00",
            tax_rate="0.00",
            tax_amount="0.00",
            gross_amount="10.00",
            currency="EUR",
        )

        list_response = self.client.get(self.charges_url())
        payment_response = self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={
                    "organization_id": self.organization.id,
                    "charge_id": hidden_charge.id,
                },
            ),
            {"amount": "10.00"},
            format="json",
        )

        self.assertEqual(list_response.data, [])
        self.assertEqual(payment_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancelled_subscription_keeps_charge_history(self):
        response = self.create_subscription()
        detail_url = reverse(
            "subscription-detail",
            kwargs={
                "organization_id": self.organization.id,
                "subscription_id": response.data["id"],
            },
        )

        update_response = self.client.patch(detail_url, {"status": "cancelled"}, format="json")

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Charge.objects.filter(subscription_id=response.data["id"]).count(), 1)


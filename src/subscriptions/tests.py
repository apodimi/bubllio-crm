from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company, CompanyTimelineEvent
from organizations.models import Organization, OrganizationMembership

from .models import Charge, CustomerSubscription, Payment, ServiceCatalogItem
from .services import subscription_overview


class SubscriptionApiTests(APITestCase):
    def test_overview_aggregates_without_loading_models_or_multiplying_payments(self):
        first = self.create_subscription(currency="EUR")
        eur_charge = Charge.objects.get(subscription_id=first.data['id'])
        Payment.objects.create(organization=self.organization, charge=eur_charge, amount='10.00', paid_date=date(2026, 10, 5))
        Payment.objects.create(organization=self.organization, charge=eur_charge, amount='20.00', paid_date=date(2026, 10, 5))
        second = self.create_subscription(catalog_item=None, name='Quarterly', net_price='60.00', tax_rate='0', currency='USD', billing_interval='quarterly')
        usd_charge = Charge.objects.get(subscription_id=second.data['id'])
        Payment.objects.create(organization=self.organization, charge=usd_charge, amount='60.00', paid_date=date(2026, 10, 5))
        third = self.create_subscription()
        Charge.objects.filter(subscription_id=third.data['id']).update(state='cancelled')
        with patch('subscriptions.services.timezone.localdate', return_value=date(2026, 10, 13)), \
             patch.object(Charge, 'from_db', side_effect=AssertionError('No charge hydration')), \
             patch.object(Payment, 'from_db', side_effect=AssertionError('No payment hydration')), \
             patch.object(CustomerSubscription, 'from_db', side_effect=AssertionError('No subscription hydration')):
            result = subscription_overview(self.organization)
        self.assertEqual(result['open_balances'], {'EUR': Decimal('94.00')})
        self.assertEqual(result['overdue_balances'], {'EUR': Decimal('94.00')})
        self.assertEqual(result['overdue_charges'], 1)
        self.assertEqual(result['collected_this_month'], {'EUR': Decimal('30.00'), 'USD': Decimal('60.00')})
        self.assertEqual(result['monthly_recurring_revenue'], {'EUR': Decimal('200.00'), 'USD': Decimal('20.00')})

    def test_billing_query_count_does_not_grow_with_charges(self):
        self.create_subscription()
        overview_url = reverse("subscription-overview", kwargs={"organization_id": self.organization.id})
        def measure(url):
            with CaptureQueriesContext(connection) as queries:
                response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            return len(queries)

        baseline = {url: measure(url) for url in (self.charges_url(), overview_url)}
        for _ in range(5):
            self.create_subscription()
        for url, count in baseline.items():
            self.assertEqual(measure(url), count)

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
        self.assertTrue(
            CompanyTimelineEvent.objects.filter(
                company=self.company,
                event_type=CompanyTimelineEvent.EventType.SERVICE_CREATED,
                source_id=response.data["id"],
            ).exists()
        )

    def test_custom_subscription_requires_commercial_fields(self):
        response = self.client.post(
            self.subscriptions_url(), {"company": self.company.id}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("net_price", response.data)

    def test_custom_subscription_always_exposes_an_empty_catalog_item_name(self):
        response = self.create_subscription(
            catalog_item=None,
            name="Custom support",
            net_price="80.00",
            currency="EUR",
            tax_rate="24.00",
            billing_interval="monthly",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["catalog_item_name"], "")

        listed = self.client.get(self.subscriptions_url())
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(listed.data[0]["catalog_item_name"], "")

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
        self.assertEqual(
            CompanyTimelineEvent.objects.filter(
                company=self.company,
                event_type=CompanyTimelineEvent.EventType.PAYMENT_RECORDED,
            ).count(),
            2,
        )

    def test_updating_service_price_recalculates_partially_paid_charge_balance(self):
        subscription_response = self.create_subscription()
        subscription_id = subscription_response.data["id"]
        charge = Charge.objects.get(subscription_id=subscription_id)
        self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
            ),
            {"amount": "40.00"},
            format="json",
        )

        update_response = self.client.patch(
            reverse(
                "subscription-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription_id,
                },
            ),
            {"net_price": "200.00"},
            format="json",
        )
        updated_charge = self.client.get(self.charges_url()).data[0]

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(updated_charge["net_amount"], "200.00")
        self.assertEqual(updated_charge["tax_amount"], "48.00")
        self.assertEqual(updated_charge["gross_amount"], "248.00")
        self.assertEqual(updated_charge["paid_amount"], "40.00")
        self.assertEqual(updated_charge["outstanding_amount"], "208.00")

    def test_updating_service_tax_recalculates_unpaid_charge(self):
        subscription_response = self.create_subscription()

        update_response = self.client.patch(
            reverse(
                "subscription-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription_response.data["id"],
                },
            ),
            {"tax_rate": "10.00"},
            format="json",
        )
        updated_charge = self.client.get(self.charges_url()).data[0]

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(updated_charge["tax_amount"], "10.00")
        self.assertEqual(updated_charge["gross_amount"], "110.00")
        self.assertEqual(updated_charge["outstanding_amount"], "110.00")

    def test_service_total_cannot_be_reduced_below_amount_already_paid(self):
        subscription_response = self.create_subscription()
        subscription_id = subscription_response.data["id"]
        charge = Charge.objects.get(subscription_id=subscription_id)
        self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
            ),
            {"amount": "100.00"},
            format="json",
        )

        update_response = self.client.patch(
            reverse(
                "subscription-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription_id,
                },
            ),
            {"net_price": "50.00", "tax_rate": "0.00"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_400_BAD_REQUEST)
        charge.refresh_from_db()
        self.assertEqual(charge.gross_amount, Decimal("124.00"))
        self.assertEqual(
            CustomerSubscription.objects.get(id=subscription_id).net_price,
            Decimal("100.00"),
        )

    def test_updating_service_keeps_paid_charge_history_and_updates_future_charge(self):
        subscription_response = self.create_subscription()
        subscription_id = subscription_response.data["id"]
        paid_charge = Charge.objects.get(subscription_id=subscription_id)
        self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={
                    "organization_id": self.organization.id,
                    "charge_id": paid_charge.id,
                },
            ),
            {"amount": "124.00"},
            format="json",
        )
        future_charge = Charge.objects.get(
            subscription_id=subscription_id,
            due_date=date(2026, 11, 5),
        )

        update_response = self.client.patch(
            reverse(
                "subscription-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription_id,
                },
            ),
            {"net_price": "200.00"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        paid_charge.refresh_from_db()
        future_charge.refresh_from_db()
        self.assertEqual(paid_charge.gross_amount, Decimal("124.00"))
        self.assertEqual(future_charge.gross_amount, Decimal("248.00"))

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

    def test_immediate_cancellation_keeps_charge_history(self):
        response = self.create_subscription()
        cancel_url = reverse(
            "subscription-cancel",
            kwargs={
                "organization_id": self.organization.id,
                "subscription_id": response.data["id"],
            },
        )

        update_response = self.client.post(cancel_url, {"mode": "immediate"}, format="json")

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["effective_status"], "cancelled")
        self.assertEqual(Charge.objects.filter(subscription_id=response.data["id"]).count(), 1)

    def test_cancellation_after_payment_keeps_access_until_period_end(self):
        response = self.create_subscription()
        subscription = CustomerSubscription.objects.get(id=response.data["id"])
        current_charge = subscription.charges.get()
        payment_url = reverse(
            "charge-payment-list",
            kwargs={"organization_id": self.organization.id, "charge_id": current_charge.id},
        )
        self.client.post(payment_url, {"amount": "124.00"}, format="json")
        next_charge = subscription.charges.get(due_date=date(2026, 11, 5))

        cancel_response = self.client.post(
            reverse(
                "subscription-cancel",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription.id,
                },
            ),
            {"mode": "end_of_period"},
            format="json",
        )

        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_response.data["effective_status"], "cancelling")
        self.assertEqual(cancel_response.data["cancellation_effective_date"], "2026-11-04")
        next_charge.refresh_from_db()
        self.assertEqual(next_charge.state, Charge.State.CANCELLED)
        self.assertEqual(current_charge.payments.count(), 1)

    def test_payment_during_notice_period_does_not_create_next_charge(self):
        response = self.create_subscription()
        subscription = CustomerSubscription.objects.get(id=response.data["id"])
        charge = subscription.charges.get()
        self.client.post(
            reverse(
                "subscription-cancel",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription.id,
                },
            ),
            {"mode": "end_of_period"},
            format="json",
        )

        payment_response = self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
            ),
            {"amount": "124.00"},
            format="json",
        )

        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(subscription.charges.count(), 1)

    def test_pending_cancellation_can_be_resumed_and_reopens_next_charge(self):
        response = self.create_subscription()
        subscription = CustomerSubscription.objects.get(id=response.data["id"])
        charge = subscription.charges.get()
        self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
            ),
            {"amount": "124.00"},
            format="json",
        )
        cancel_url = reverse(
            "subscription-cancel",
            kwargs={
                "organization_id": self.organization.id,
                "subscription_id": subscription.id,
            },
        )
        self.client.post(cancel_url, {"mode": "end_of_period"}, format="json")

        resume_response = self.client.post(
            reverse(
                "subscription-resume",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription.id,
                },
            ),
            format="json",
        )

        self.assertEqual(resume_response.status_code, status.HTTP_200_OK)
        self.assertEqual(resume_response.data["effective_status"], "active")
        self.assertEqual(
            subscription.charges.get(due_date=date(2026, 11, 5)).state,
            Charge.State.OPEN,
        )

    def test_overview_reports_operational_metrics_by_currency(self):
        response = self.create_subscription(renewal_date="2026-10-20")
        subscription = CustomerSubscription.objects.get(id=response.data["id"])
        charge = subscription.charges.get()
        charge.due_date = date(2026, 10, 4)
        charge.save(update_fields=("due_date", "updated_at"))
        self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
            ),
            {"amount": "24.00", "paid_date": "2026-10-05"},
            format="json",
        )

        with patch("subscriptions.services.timezone.localdate", return_value=date(2026, 10, 13)):
            overview = self.client.get(
                reverse("subscription-overview", kwargs={"organization_id": self.organization.id})
            )

        self.assertEqual(overview.status_code, status.HTTP_200_OK)
        self.assertEqual(overview.data["active_subscriptions"], 1)
        self.assertEqual(overview.data["renewals_next_30_days"], 1)
        self.assertEqual(overview.data["overdue_charges"], 1)
        self.assertEqual(overview.data["open_balances"]["EUR"], 100)
        self.assertEqual(overview.data["collected_this_month"]["EUR"], 24)
        self.assertEqual(overview.data["monthly_recurring_revenue"]["EUR"], 100)

    def test_pause_action_cancels_future_charge_and_resume_reopens_it(self):
        response = self.create_subscription()
        subscription = CustomerSubscription.objects.get(id=response.data["id"])
        charge = subscription.charges.get()
        self.client.post(
            reverse(
                "charge-payment-list",
                kwargs={"organization_id": self.organization.id, "charge_id": charge.id},
            ),
            {"amount": "124.00"},
            format="json",
        )

        pause_url = reverse(
            "subscription-pause",
            kwargs={
                "organization_id": self.organization.id,
                "subscription_id": subscription.id,
            },
        )
        pause_response = self.client.post(pause_url, format="json")
        future_charge = subscription.charges.get(due_date=date(2026, 11, 5))

        self.assertEqual(pause_response.status_code, status.HTTP_200_OK)
        self.assertEqual(future_charge.state, Charge.State.CANCELLED)

        resume_response = self.client.post(
            reverse(
                "subscription-resume",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": subscription.id,
                },
            ),
            format="json",
        )
        future_charge.refresh_from_db()
        self.assertEqual(resume_response.status_code, status.HTTP_200_OK)
        self.assertEqual(future_charge.state, Charge.State.OPEN)

    def test_status_cannot_be_changed_through_generic_update(self):
        response = self.create_subscription()
        detail_url = reverse(
            "subscription-detail",
            kwargs={
                "organization_id": self.organization.id,
                "subscription_id": response.data["id"],
            },
        )

        update_response = self.client.patch(detail_url, {"status": "paused"}, format="json")

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["status"], "active")

    def test_catalog_service_creation_defaults_first_charge_to_start_date(self):
        response = self.client.post(
            self.subscriptions_url(),
            {
                "company": self.company.id,
                "catalog_item": self.catalog_item.id,
                "start_date": "2026-10-05",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["next_billing_date"], "2026-10-05")

    def test_past_end_date_is_effectively_expired_and_excluded_from_metrics(self):
        subscription = CustomerSubscription.objects.create(
            organization=self.organization,
            company=self.company,
            name="Ended service",
            net_price="100.00",
            currency="EUR",
            tax_rate="24.00",
            billing_interval="monthly",
            start_date=date(2026, 9, 1),
            next_billing_date=date(2026, 10, 1),
            end_date=date(2026, 10, 4),
        )

        overview = self.client.get(
            reverse("subscription-overview", kwargs={"organization_id": self.organization.id})
        )

        self.assertEqual(subscription.effective_status, CustomerSubscription.Status.EXPIRED)
        self.assertEqual(overview.data["active_subscriptions"], 0)
        self.assertEqual(overview.data["monthly_recurring_revenue"], {})

    def test_cancellation_and_overview_are_tenant_scoped(self):
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

        cancellation = self.client.post(
            reverse(
                "subscription-cancel",
                kwargs={
                    "organization_id": self.organization.id,
                    "subscription_id": other_subscription.id,
                },
            ),
            {"mode": "end_of_period"},
            format="json",
        )
        overview = self.client.get(
            reverse(
                "subscription-overview",
                kwargs={"organization_id": self.other_organization.id},
            )
        )

        self.assertEqual(cancellation.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(overview.status_code, status.HTTP_404_NOT_FOUND)

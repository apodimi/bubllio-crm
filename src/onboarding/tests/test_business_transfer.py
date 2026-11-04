import hashlib
import json
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from activities.models import Task
from companies.models import Company, CompanyTimelineEvent
from contacts.models import Contact
from deals.models import Deal
from onboarding.services.business_transfer_schema import BUSINESS_DATASETS
from organizations.models import (
    EmailAccount,
    Organization,
    OrganizationMembership,
    OrganizationProvisioning,
)
from subscriptions.models import Charge, CustomerSubscription, Payment, ServiceCatalogItem


User = get_user_model()


class BusinessTransferTests(APITestCase):
    def setUp(self):
        self.administrator = User.objects.create_superuser(
            username="admin", email="admin@example.test", password="source-password"
        )
        self.member = User.objects.create_user(
            username="seller", email="seller@example.test", password="member-password"
        )
        self.organization = Organization.objects.create(name="Sales", slug="sales")
        self.other_organization = Organization.objects.create(name="Projects", slug="projects")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.member,
            role=OrganizationMembership.Role.MEMBER,
        )

    def test_transfer_contains_business_graph_with_stable_ids_and_no_secrets(self):
        company = Company.objects.create(
            organization=self.organization,
            assigned_to=self.member,
            name="Customer One",
            tax_id="123456789",
            notes="Customer history",
        )
        other_company = Company.objects.create(
            organization=self.other_organization, name="Customer Two"
        )
        contact = Contact.objects.create(
            organization=self.organization,
            company=company,
            first_name="Alex",
            is_primary=True,
        )
        deal = Deal.objects.create(
            organization=self.organization,
            company=company,
            contact=contact,
            assigned_to=self.member,
            title="Annual contract",
            value=Decimal("1234.56"),
        )
        task = Task.objects.create(
            organization=self.organization,
            company=company,
            contact=contact,
            deal=deal,
            assigned_to=self.member,
            title="Follow up",
            due_at=timezone.now() + timedelta(days=1),
        )
        catalog = ServiceCatalogItem.objects.create(
            organization=self.organization, name="Support", default_net_price=Decimal("99.95")
        )
        subscription = CustomerSubscription.objects.create(
            organization=self.organization,
            company=company,
            catalog_item=catalog,
            originating_deal=deal,
            name="Support plan",
            net_price=Decimal("99.95"),
            billing_interval=ServiceCatalogItem.BillingInterval.MONTHLY,
            start_date=date(2026, 1, 1),
            next_billing_date=date(2026, 2, 1),
        )
        charge = Charge.objects.create(
            organization=self.organization,
            subscription=subscription,
            coverage_start=date(2026, 1, 1),
            coverage_end=date(2026, 1, 31),
            due_date=date(2026, 2, 1),
            net_amount=Decimal("99.95"),
            tax_rate=Decimal("24.00"),
            tax_amount=Decimal("23.99"),
            gross_amount=Decimal("123.94"),
            currency="EUR",
        )
        payment = Payment.objects.create(
            organization=self.organization,
            charge=charge,
            amount=Decimal("123.94"),
            recorded_by=self.member,
        )
        CompanyTimelineEvent.objects.create(
            organization=self.organization,
            company=company,
            actor=self.member,
            category=CompanyTimelineEvent.Category.DEAL,
            event_type=CompanyTimelineEvent.EventType.DEAL_CREATED,
            source_type="deal",
            source_id=deal.id,
        )
        EmailAccount.objects.create(
            organization=self.organization,
            name="Secret SMTP",
            host="smtp.example.test",
            port=587,
            encrypted_password="never-export-this-password",
            from_email="sender@example.test",
        )

        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(reverse("installation-business-transfer")).status_code, 403)

        self.client.force_authenticate(self.administrator)
        response = self.client.get(reverse("installation-business-transfer"))
        self.assertEqual(response.status_code, 200)
        transfer = json.loads(b"".join(response.streaming_content))
        response.close()
        self.assertEqual(transfer["format"], "bubllio-crm-business-transfer")
        self.assertEqual(transfer["format_version"], 1)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertEqual(set(transfer["datasets"]), {name for name, _ in BUSINESS_DATASETS})

        datasets = transfer["datasets"]
        self.assertEqual({row["id"] for row in datasets["companies"]}, {str(company.id), str(other_company.id)})
        self.assertEqual(datasets["companies"][0]["customer_code"], company.customer_code)
        self.assertEqual(datasets["deals"][0]["id"], str(deal.id))
        self.assertEqual(datasets["deals"][0]["value"], "1234.56")
        self.assertEqual(datasets["tasks"][0]["deal_id"], str(deal.id))
        self.assertEqual(datasets["tasks"][0]["id"], str(task.id))
        self.assertEqual(datasets["payments"][0]["charge_id"], str(charge.id))
        self.assertEqual(datasets["payments"][0]["id"], str(payment.id))
        self.assertEqual(datasets["charges"][0]["gross_amount"], "123.94")
        self.assertEqual(datasets["customer_subscriptions"][0]["id"], str(subscription.id))
        self.assertEqual(transfer["users"], [
            {"id": self.member.pk, "username": "seller", "email": "seller@example.test"}
        ])
        for name, rows in {"users": transfer["users"], **datasets}.items():
            digest = hashlib.sha256(
                json.dumps(rows, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
            ).hexdigest()
            self.assertEqual(transfer["manifest"][name], {"count": len(rows), "sha256": digest})

        serialized = json.dumps(transfer)
        self.assertNotIn("source-password", serialized)
        self.assertNotIn("member-password", serialized)
        self.assertNotIn("never-export-this-password", serialized)

    def test_pending_workspace_is_rejected_instead_of_becoming_active(self):
        OrganizationProvisioning.objects.create(
            organization=self.other_organization,
            creator=self.administrator,
            owner_email="owner@example.test",
        )
        self.client.force_authenticate(self.administrator)
        response = self.client.get(reverse("installation-business-transfer"))

        self.assertEqual(response.status_code, 409)
        self.assertIn("pending workspace", response.data["detail"])

    def test_cross_organization_relation_is_rejected(self):
        other_company = Company.objects.create(
            organization=self.other_organization, name="Other company"
        )
        Deal.objects.create(
            organization=self.organization,
            company=other_company,
            title="Invalid tenant link",
        )
        self.client.force_authenticate(self.administrator)
        response = self.client.get(reverse("installation-business-transfer"))

        self.assertEqual(response.status_code, 409)
        self.assertIn("crosses organizations", response.data["detail"])

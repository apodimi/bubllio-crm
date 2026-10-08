from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from activities.models import Task
from accounts.models import UserProfile
from companies.models import Company
from contacts.models import Contact
from deals.models import Deal
from organizations.models import (
    InstallationState,
    Organization,
    OrganizationMembership,
    OrganizationSettings,
)
from subscriptions.models import CustomerSubscription, Payment, ServiceCatalogItem
from subscriptions.services import ensure_charge


DEMO_SLUG = "bubllio-demo"
DEMO_USERNAMES = ("demo", "demo-member")


class Command(BaseCommand):
    help = "Create deterministic CRM data for local development."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove the existing Bubllio demo workspace before recreating it.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo is disabled when DJANGO_DEBUG is false.")

        if options["reset"]:
            Organization.objects.filter(slug=DEMO_SLUG).delete()
            get_user_model().objects.filter(username__in=DEMO_USERNAMES).delete()

        owner = self._user("demo", "demo@example.test", "Demo Owner")
        member = self._user("demo-member", "member@example.test", "Demo Member")
        organization, _ = Organization.objects.update_or_create(
            slug=DEMO_SLUG,
            defaults={"name": "Bubllio Demo Workspace"},
        )
        OrganizationMembership.objects.update_or_create(
            organization=organization,
            user=owner,
            defaults={"role": OrganizationMembership.Role.OWNER},
        )
        OrganizationMembership.objects.update_or_create(
            organization=organization,
            user=member,
            defaults={"role": OrganizationMembership.Role.MEMBER},
        )
        OrganizationSettings.objects.update_or_create(
            organization=organization,
            defaults={
                "timezone": "Europe/Athens",
                "locale": "el",
                "legal_name": "Bubllio Demo IKE",
                "business_email": "hello@example.test",
                "country": "GR",
                "currency": "EUR",
                "default_tax_rate": Decimal("24.00"),
            },
        )
        InstallationState.objects.update_or_create(
            pk=1,
            defaults={"completed_at": timezone.now()},
        )

        today = timezone.localdate()
        now = timezone.now()
        acme = self._company(organization, owner, "Acme Systems", "customer", "Athens")
        atlas = self._company(organization, member, "Atlas Foods", "prospect", "Thessaloniki")
        helios = self._company(organization, owner, "Helios Energy", "lead", "Patras")
        self._company(organization, None, "Northwind Studio", "inactive", "Larissa")

        maria = self._contact(organization, acme, owner, "Maria", "Papadopoulou", True)
        nikos = self._contact(organization, atlas, member, "Nikos", "Georgiou", True)
        self._contact(organization, helios, owner, "Eleni", "Kosta", True)

        renewal = self._deal(
            organization, acme, maria, owner, "Acme annual renewal", "negotiation", "12500.00", 75
        )
        self._deal(
            organization, atlas, nikos, member, "Atlas onboarding", "proposal", "4800.00", 55
        )
        self._deal(
            organization, helios, None, owner, "Helios support plan", "qualified", "7200.00", 35
        )

        self._task(organization, acme, maria, renewal, owner, "Confirm renewal terms", now + timedelta(days=1))
        self._task(organization, atlas, nikos, None, member, "Send onboarding proposal", now - timedelta(days=1))
        self._task(organization, helios, None, None, owner, "Schedule discovery call", now + timedelta(days=4))

        service, _ = ServiceCatalogItem.objects.update_or_create(
            organization=organization,
            internal_code="HOST-MONTHLY",
            defaults={
                "name": "Managed hosting",
                "description": "Hosting, monitoring, and monthly maintenance.",
                "default_net_price": Decimal("120.00"),
                "currency": "EUR",
                "default_tax_rate": Decimal("24.00"),
                "billing_interval": ServiceCatalogItem.BillingInterval.MONTHLY,
            },
        )
        subscription, _ = CustomerSubscription.objects.update_or_create(
            organization=organization,
            company=acme,
            name="Acme managed hosting",
            defaults={
                "catalog_item": service,
                "assigned_to": owner,
                "net_price": Decimal("120.00"),
                "currency": "EUR",
                "tax_rate": Decimal("24.00"),
                "billing_interval": ServiceCatalogItem.BillingInterval.MONTHLY,
                "start_date": today.replace(day=1),
                "next_billing_date": today.replace(day=1),
                "renewal_date": today + timedelta(days=20),
                "status": CustomerSubscription.Status.ACTIVE,
            },
        )
        charge = ensure_charge(subscription)
        Payment.objects.get_or_create(
            organization=organization,
            charge=charge,
            external_reference="DEMO-PAYMENT-001",
            defaults={
                "amount": Decimal("50.00"),
                "paid_date": today,
                "payment_method": "bank_transfer",
                "recorded_by": owner,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
        self.stdout.write("Login: demo / demo-password")

    def _user(self, username, email, display_name):
        user, _ = get_user_model().objects.get_or_create(
            username=username,
            defaults={"email": email},
        )
        user.email = email
        user.is_active = True
        user.set_password("demo-password")
        user.save(update_fields=("email", "is_active", "password"))
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.display_name = display_name
        profile.save(update_fields=("display_name", "updated_at"))
        return user

    def _company(self, organization, owner, name, stage, city):
        company, _ = Company.objects.update_or_create(
            organization=organization,
            name=name,
            defaults={
                "assigned_to": owner,
                "lifecycle_stage": stage,
                "industry": "Technology",
                "email": f"hello@{name.lower().replace(' ', '-')}.example.test",
                "city": city,
                "country": "GR",
            },
        )
        return company

    def _contact(self, organization, company, owner, first_name, last_name, primary):
        contact, _ = Contact.objects.update_or_create(
            organization=organization,
            company=company,
            email=f"{first_name.lower()}@example.test",
            defaults={
                "assigned_to": owner,
                "first_name": first_name,
                "last_name": last_name,
                "job_title": "Operations Manager",
                "is_primary": primary,
            },
        )
        return contact

    def _deal(self, organization, company, contact, owner, title, stage, value, probability):
        deal, _ = Deal.objects.update_or_create(
            organization=organization,
            title=title,
            defaults={
                "company": company,
                "contact": contact,
                "assigned_to": owner,
                "stage": stage,
                "value": Decimal(value),
                "currency": "EUR",
                "probability": probability,
                "expected_close_date": timezone.localdate() + timedelta(days=30),
            },
        )
        return deal

    def _task(self, organization, company, contact, deal, owner, title, due_at):
        Task.objects.update_or_create(
            organization=organization,
            title=title,
            defaults={
                "company": company,
                "contact": contact,
                "deal": deal,
                "assigned_to": owner,
                "created_by": owner,
                "due_at": due_at,
                "priority": Task.Priority.HIGH,
            },
        )

from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from activities.models import Task
from companies.models import Company
from contacts.models import Contact
from deals.models import Deal
from organizations.models import Organization
from subscriptions.models import CustomerSubscription


class SeedDemoCommandTests(TestCase):
    @override_settings(DEBUG=True)
    def test_command_creates_deterministic_demo_dataset(self):
        output = StringIO()

        call_command("seed_demo", stdout=output)
        call_command("seed_demo", stdout=output)

        organization = Organization.objects.get(slug="bubllio-demo")
        self.assertEqual(Company.objects.filter(organization=organization).count(), 4)
        self.assertEqual(Contact.objects.filter(organization=organization).count(), 3)
        self.assertEqual(Deal.objects.filter(organization=organization).count(), 3)
        self.assertEqual(Task.objects.filter(organization=organization).count(), 3)
        self.assertEqual(
            CustomerSubscription.objects.filter(organization=organization).count(),
            1,
        )
        self.assertIn("demo / demo-password", output.getvalue())

    @override_settings(DEBUG=False)
    def test_command_is_disabled_outside_debug_mode(self):
        with self.assertRaisesMessage(CommandError, "disabled"):
            call_command("seed_demo")

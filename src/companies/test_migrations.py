from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class DatabaseUpgradeTests(TransactionTestCase):
    before = [('companies', '0005_backfill_company_timeline'), ('contacts', '0002_contactactivity_alter_contact_options_and_more')]

    def setUp(self):
        executor = MigrationExecutor(connection)
        self.latest = executor.loader.graph.leaf_nodes()
        executor.migrate(self.before)
        self.apps = executor.loader.project_state(self.before).apps

    def tearDown(self):
        MigrationExecutor(connection).migrate(self.latest)
        super().tearDown()

    def test_upgrade_preserves_codes_and_initializes_counter(self):
        Organization = self.apps.get_model('organizations', 'Organization')
        Company = self.apps.get_model('companies', 'Company')
        org = Organization.objects.create(name='Upgrade', slug='upgrade')
        first = Company.objects.create(organization=org, name='Old', customer_code='CUS-00999')
        Company.objects.create(organization=org, name='Custom', customer_code='EXTERNAL-1')
        MigrationExecutor(connection).migrate(self.latest)
        from companies.models import Company as CurrentCompany, CustomerCodeCounter
        self.assertEqual(CurrentCompany.objects.get(pk=first.pk).customer_code, 'CUS-00999')
        self.assertEqual(CustomerCodeCounter.objects.get(organization_id=org.pk).last_number, 999)
        self.assertEqual(CurrentCompany.objects.create(organization_id=org.pk, name='New').customer_code, 'CUS-01000')

    def test_upgrade_rejects_duplicates_without_changing_records(self):
        Organization = self.apps.get_model('organizations', 'Organization')
        Company = self.apps.get_model('companies', 'Company')
        org = Organization.objects.create(name='Conflicts', slug='conflicts')
        first = Company.objects.create(organization=org, name='A', customer_code='CUS-00001', email='DUP@example.test')
        second = Company.objects.create(organization=org, name='B', customer_code='CUS-00002', email='dup@example.test')
        try:
            with self.assertRaisesRegex(RuntimeError, 'duplicates exist'):
                MigrationExecutor(connection).migrate(self.latest)
            self.assertEqual(Company.objects.filter(pk__in=[first.pk, second.pk]).count(), 2)
        finally:
            Company.objects.filter(pk=second.pk).update(email='resolved@example.test')

    def test_upgrade_rejects_contact_duplicates(self):
        Organization = self.apps.get_model('organizations', 'Organization')
        Company = self.apps.get_model('companies', 'Company')
        Contact = self.apps.get_model('contacts', 'Contact')
        org = Organization.objects.create(name='Contacts', slug='contact-conflicts')
        company = Company.objects.create(organization=org, name='A', customer_code='CUS-00001')
        Contact.objects.create(organization=org, company=company, first_name='A', email='DUP@example.test')
        second = Contact.objects.create(organization=org, company=company, first_name='B', email='dup@example.test')
        try:
            with self.assertRaisesRegex(RuntimeError, 'Contact email duplicates'):
                MigrationExecutor(connection).migrate(self.latest)
            self.assertEqual(Contact.objects.filter(organization=org).count(), 2)
        finally:
            Contact.objects.filter(pk=second.pk).update(email='resolved@example.test')

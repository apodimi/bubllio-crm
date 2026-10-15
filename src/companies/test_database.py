from concurrent.futures import ThreadPoolExecutor
from unittest import skipUnless

from django.db import IntegrityError, close_old_connections, connection, transaction
from django.test import TestCase, TransactionTestCase
from rest_framework.exceptions import ValidationError

from contacts.models import Contact
from organizations.models import Organization

from .models import Company, CustomerCodeCounter
from .serializers import CompanySerializer


class DatabaseInvariantTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Database tests", slug="database-tests")

    def test_counter_handles_explicit_codes_deletion_and_rollback(self):
        first = Company.objects.create(organization=self.org, name="First", customer_code="CUS-00120")
        second = Company.objects.create(organization=self.org, name="Second")
        self.assertEqual(second.customer_code, "CUS-00121")
        second.delete()
        third = Company.objects.create(organization=self.org, name="Third")
        self.assertEqual(third.customer_code, "CUS-00122")
        try:
            with transaction.atomic():
                Company.objects.create(organization=self.org, name="Rolled back")
                raise ValueError("rollback")
        except ValueError:
            pass
        self.assertEqual(CustomerCodeCounter.objects.get(organization=self.org).last_number, 122)
        third.customer_code = 'CUS-00200'
        third.save(update_fields=['customer_code'])
        self.assertEqual(Company.objects.create(organization=self.org, name='After edit').customer_code, 'CUS-00201')
        other = Organization.objects.create(name="Other", slug="other-counter")
        self.assertEqual(Company.objects.create(organization=other, name="Other").customer_code, "CUS-00001")
        self.assertTrue(Company.objects.filter(pk=first.pk).exists())

    def test_case_insensitive_company_identity_constraints_allow_blanks_and_other_tenants(self):
        Company.objects.create(organization=self.org, name="First", email="HELLO@example.test", tax_id="GR123")
        for values in ({"email": "hello@example.test"}, {"tax_id": "gr123"}):
            with self.assertRaises(IntegrityError), transaction.atomic():
                Company.objects.create(organization=self.org, name="Duplicate", **values)
        Company.objects.create(organization=self.org, name="Blank one")
        Company.objects.create(organization=self.org, name="Blank two")
        other = Organization.objects.create(name="Other", slug="other-identity")
        Company.objects.create(organization=other, name="Allowed", email="hello@example.test", tax_id="gr123")

    def test_contact_identity_constraint(self):
        company = Company.objects.create(organization=self.org, name="Customer")
        Contact.objects.create(organization=self.org, company=company, first_name="A", email="PERSON@example.test")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Contact.objects.create(organization=self.org, company=company, first_name="B", email="person@example.test")
        for name in ("Blank A", "Blank B"):
            Contact.objects.create(organization=self.org, company=company, first_name=name)
        other = Organization.objects.create(name="Other", slug="other-contact")
        other_company = Company.objects.create(organization=other, name="Other")
        Contact.objects.create(organization=other, company=other_company, first_name="Allowed", email="person@example.test")

    def test_late_company_duplicate_becomes_validation_error(self):
        serializer = CompanySerializer(data={"name": "Race", "email": "race@example.test"}, context={"organization": self.org})
        serializer.is_valid(raise_exception=True)
        Company.objects.create(organization=self.org, name="Winner", email="RACE@example.test")
        with self.assertRaises(ValidationError) as caught:
            serializer.save(organization=self.org)
        self.assertIn("email", caught.exception.detail)
        self.assertEqual(Company.objects.filter(organization=self.org).count(), 1)

    def test_late_contact_duplicate_becomes_validation_error(self):
        from contacts.serializers import ContactSerializer
        company = Company.objects.create(organization=self.org, name='Customer')
        serializer = ContactSerializer(data={'first_name': 'Race', 'company': str(company.pk), 'email': 'race@example.test'}, context={'organization': self.org})
        serializer.is_valid(raise_exception=True)
        Contact.objects.create(organization=self.org, company=company, first_name='Winner', email='RACE@example.test')
        with self.assertRaises(ValidationError) as caught:
            serializer.save(organization=self.org)
        self.assertIn('email', caught.exception.detail)


@skipUnless(connection.vendor == "postgresql", "Row-lock concurrency is tested on PostgreSQL")
class CustomerCounterConcurrencyTests(TransactionTestCase):
    def test_concurrent_creation_allocates_distinct_codes(self):
        org = Organization.objects.create(name="Concurrent", slug="concurrent")
        def create(index):
            close_old_connections()
            try:
                return Company.objects.create(organization_id=org.pk, name=f"Customer {index}").customer_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=4) as pool:
            codes = list(pool.map(create, range(12)))
        self.assertEqual(len(set(codes)), 12)
        self.assertEqual(CustomerCodeCounter.objects.get(organization=org).last_number, 12)

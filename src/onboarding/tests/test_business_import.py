import hashlib
import io
import json
import tempfile
from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from companies.models import Company
from access.models import SuiteUserLink
from deals.models import Deal
from onboarding.services.business_transfer_schema import BUSINESS_DATASETS
from onboarding.services.business_transfer import build_business_transfer
from onboarding.services.business_import import (
    BusinessImportError,
    import_business_transfer,
    load_business_transfer,
)
from organizations.models import (
    InstallationState,
    Organization,
    OrganizationMembership,
    OrganizationSettings,
)


User = get_user_model()


class BusinessImportTests(APITestCase):
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

    def test_transfer_restores_customers_deals_and_references_with_original_ids(self):
        company = Company.objects.create(
            organization=self.organization, assigned_to=self.member, name="Acme"
        )
        deal = Deal.objects.create(
            organization=self.organization, company=company, assigned_to=self.member,
            title="Renewal", value=Decimal("42.30"),
        )
        original_created_at = company.created_at
        transfer = build_business_transfer()
        parsed = load_business_transfer(io.StringIO(json.dumps(transfer)))
        for _, model in reversed(BUSINESS_DATASETS):
            model._base_manager.all().delete()
        self.prepare_target()

        counts = import_business_transfer(parsed, trial_admin=self.administrator)

        self.assertEqual(counts["companies"], 1)
        self.assertEqual(counts["deals"], 1)
        restored_company = Company.objects.get(pk=company.pk)
        restored_deal = Deal.objects.get(pk=deal.pk)
        self.assertEqual(restored_company.customer_code, company.customer_code)
        self.assertEqual(restored_company.created_at, original_created_at)
        self.assertEqual(restored_deal.company_id, company.pk)
        self.assertEqual(restored_deal.value, Decimal("42.30"))
        self.assertFalse(restored_deal.assigned_to.is_active)
        self.assertFalse(restored_deal.assigned_to.has_usable_password())
        self.assertEqual(restored_deal.assigned_to_id, restored_company.assigned_to_id)
        self.assertTrue(
            OrganizationMembership.objects.filter(
                organization_id=self.organization.pk, user=self.administrator,
                role=OrganizationMembership.Role.ADMIN,
            ).exists()
        )
        with self.assertRaisesRegex(BusinessImportError, "only its setup workspace"):
            import_business_transfer(parsed, trial_admin=self.administrator)

    def test_import_rejects_tampered_transfer_before_writing(self):
        transfer = build_business_transfer()
        transfer["datasets"]["organizations"][0]["name"] = "Tampered"
        with self.assertRaisesRegex(BusinessImportError, "checksum"):
            load_business_transfer(io.StringIO(json.dumps(transfer)))

    def test_import_rejects_cross_organization_customer_link(self):
        own_company = Company.objects.create(organization=self.organization, name="Own")
        other_company = Company.objects.create(organization=self.other_organization, name="Other")
        Deal.objects.create(organization=self.organization, company=own_company, title="Valid")
        transfer = build_business_transfer()
        transfer["datasets"]["deals"][0]["company_id"] = str(other_company.pk)
        deals = transfer["datasets"]["deals"]
        transfer["manifest"]["deals"]["sha256"] = hashlib.sha256(
            json.dumps(deals, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
        ).hexdigest()

        with self.assertRaisesRegex(BusinessImportError, "crosses organizations"):
            load_business_transfer(io.StringIO(json.dumps(transfer)))

    def test_import_command_checks_file_without_writing(self):
        transfer = build_business_transfer()
        with tempfile.NamedTemporaryFile(mode="w+", suffix=".json") as output:
            json.dump(transfer, output)
            output.flush()
            result = io.StringIO()
            call_command("import_business_transfer", output.name, stdout=result)
            self.assertEqual(Organization.objects.count(), 2)
            for _, model in reversed(BUSINESS_DATASETS):
                model._base_manager.all().delete()
            self.prepare_target()
            call_command(
                "import_business_transfer", output.name, "--apply",
                "--trial-admin", self.administrator.username, stdout=result,
            )

        self.assertIn("Transfer validated", result.getvalue())
        self.assertIn("Imported CRM business data", result.getvalue())
        self.assertEqual(Organization.objects.count(), 3)

    def test_import_rolls_back_invalid_role_value(self):
        transfer = build_business_transfer()
        transfer["datasets"]["memberships"][0]["role"] = "unrecognized-role"
        rows = transfer["datasets"]["memberships"]
        transfer["manifest"]["memberships"]["sha256"] = hashlib.sha256(
            json.dumps(rows, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
        ).hexdigest()
        for _, model in reversed(BUSINESS_DATASETS):
            model._base_manager.all().delete()
        self.prepare_target()

        with self.assertRaisesRegex(BusinessImportError, "invalid value"):
            import_business_transfer(
                load_business_transfer(io.StringIO(json.dumps(transfer))),
                trial_admin=self.administrator,
            )
        self.assertEqual(Organization.objects.count(), 1)
        self.assertEqual(OrganizationMembership.objects.count(), 1)

    def test_core_required_import_accepts_only_passwordless_suite_user(self):
        company = Company.objects.create(organization=self.organization, name="Core customer")
        transfer = build_business_transfer()
        for _, model in reversed(BUSINESS_DATASETS):
            model._base_manager.all().delete()
        self.prepare_target()
        self.administrator.is_staff = False
        self.administrator.is_superuser = False
        self.administrator.set_unusable_password()
        self.administrator.save()
        SuiteUserLink.objects.create(
            user=self.administrator,
            issuer="https://identity.example.test/realms/bubllio",
            subject="operator-sub",
        )

        with override_settings(CORE_REQUIRED=True):
            counts = import_business_transfer(transfer, trial_admin=self.administrator)

        self.assertEqual(counts["companies"], 1)
        self.assertEqual(Company.objects.get(pk=company.pk).name, "Core customer")

    @override_settings(
        CORE_REQUIRED=True,
        SUITE_OIDC_ISSUER="https://identity.example.test/realms/bubllio",
    )
    def test_fresh_core_bootstrap_imports_deals_and_preserves_member_assignments(self):
        company = Company.objects.create(
            organization=self.organization, assigned_to=self.member, name="Customer"
        )
        deal = Deal.objects.create(
            organization=self.organization, company=company, assigned_to=self.member,
            title="Renewal", value=Decimal("120.00"),
        )
        transfer = build_business_transfer()
        for _, model in reversed(BUSINESS_DATASETS):
            model._base_manager.all().delete()
        User.objects.all().delete()
        InstallationState.objects.all().delete()

        output = io.StringIO()
        call_command(
            "bootstrap_suite_crm", subject="operator-sub",
            workspace_slug="migration-staging", stdout=output,
        )
        operator = SuiteUserLink.objects.get(subject="operator-sub").user
        counts = import_business_transfer(transfer, trial_admin=operator)

        self.assertEqual(counts["companies"], 1)
        self.assertEqual(counts["deals"], 1)
        self.assertEqual(Deal.objects.get(pk=deal.pk).company_id, company.pk)
        imported_member = Deal.objects.get(pk=deal.pk).assigned_to
        self.assertFalse(imported_member.is_active)
        self.assertFalse(imported_member.has_usable_password())
        self.assertTrue(OrganizationMembership.objects.filter(
            organization_id=self.organization.pk, user=operator, role="admin"
        ).exists())

        call_command(
            "provision_suite_member", subject="seller-sub", user_id=imported_member.pk,
            crm_organization_id=self.organization.pk, core_organization_id=uuid4(),
            role="member", stdout=io.StringIO(),
        )
        imported_member.refresh_from_db()
        self.assertTrue(imported_member.is_active)
        self.assertEqual(SuiteUserLink.objects.get(user=imported_member).subject, "seller-sub")
        self.assertEqual(Deal.objects.get(pk=deal.pk).assigned_to_id, imported_member.pk)

    def test_normal_setup_settings_id_collision_and_source_owner(self):
        source_owner = OrganizationMembership.objects.create(
            organization=self.organization, user=self.administrator,
            role=OrganizationMembership.Role.OWNER,
        )
        source_settings = OrganizationSettings.objects.create(
            organization=self.organization, legal_name="Original Ltd"
        )
        transfer = build_business_transfer()
        for _, model in reversed(BUSINESS_DATASETS):
            model._base_manager.all().delete()
        bootstrap = Organization.objects.create(name="New installation", slug="new-installation")
        OrganizationMembership.objects.create(
            organization=bootstrap, user=self.administrator,
            role=OrganizationMembership.Role.OWNER,
        )
        OrganizationSettings.objects.create(id=source_settings.pk, organization=bootstrap)
        InstallationState.objects.update_or_create(
            pk=1, defaults={"completed_at": timezone.now()}
        )

        import_business_transfer(transfer, trial_admin=self.administrator)

        imported_owner = OrganizationMembership.objects.get(
            organization_id=self.organization.pk, role=OrganizationMembership.Role.OWNER
        )
        self.assertEqual(imported_owner.pk, source_owner.pk)
        self.assertFalse(imported_owner.user.is_active)
        imported_settings = OrganizationSettings.objects.get(organization_id=self.organization.pk)
        self.assertNotEqual(imported_settings.pk, source_settings.pk)
        self.assertEqual(imported_settings.legal_name, "Original Ltd")
        self.assertTrue(
            OrganizationMembership.objects.filter(
                organization_id=self.organization.pk, user=self.administrator,
                role=OrganizationMembership.Role.ADMIN,
            ).exists()
        )

    def prepare_target(self):
        bootstrap = Organization.objects.create(name="New installation", slug="new-installation")
        OrganizationMembership.objects.create(
            organization=bootstrap, user=self.administrator, role=OrganizationMembership.Role.OWNER
        )
        OrganizationSettings.objects.create(organization=bootstrap)
        InstallationState.objects.update_or_create(
            pk=1, defaults={"completed_at": timezone.now()}
        )

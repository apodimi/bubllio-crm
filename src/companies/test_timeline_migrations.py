from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class CompanyTimelineMigrationTests(TransactionTestCase):
    before = [("companies", "0003_companyactivity_company_archived_at_and_more")]
    after = [("companies", "0005_backfill_company_timeline")]

    def setUp(self):
        executor = MigrationExecutor(connection)
        self.latest = executor.loader.graph.leaf_nodes()
        executor.migrate(self.before)
        old_apps = executor.loader.project_state(self.before).apps

        Organization = old_apps.get_model("organizations", "Organization")
        Company = old_apps.get_model("companies", "Company")
        CompanyActivity = old_apps.get_model("companies", "CompanyActivity")

        organization = Organization.objects.create(name="Existing workspace", slug="existing")
        company = Company.objects.create(organization=organization, name="Existing customer")
        CompanyActivity.objects.create(
            organization=organization,
            company=company,
            action="updated",
            details={"fields": ["name"]},
        )
        self.company_id = company.id

    def tearDown(self):
        MigrationExecutor(connection).migrate(self.latest)
        super().tearDown()

    def test_backfill_preserves_existing_company_activity_and_reverses_cleanly(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.after)
        migrated_apps = executor.loader.project_state(self.after).apps
        CompanyTimelineEvent = migrated_apps.get_model(
            "companies", "CompanyTimelineEvent"
        )

        event = CompanyTimelineEvent.objects.get(company_id=self.company_id)
        self.assertEqual(event.category, "company")
        self.assertEqual(event.event_type, "company.updated")
        self.assertEqual(event.source_type, "company")
        self.assertEqual(event.source_id, self.company_id)
        self.assertEqual(event.details, {"fields": ["name"]})

        executor = MigrationExecutor(connection)
        executor.migrate([("companies", "0004_companytimelineevent")])
        reversed_apps = executor.loader.project_state(
            [("companies", "0004_companytimelineevent")]
        ).apps
        ReversedTimelineEvent = reversed_apps.get_model(
            "companies", "CompanyTimelineEvent"
        )
        self.assertFalse(ReversedTimelineEvent.objects.exists())

import logging
import uuid
from pathlib import Path
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.db import OperationalError
from django.test import SimpleTestCase, TestCase
from django.urls import Resolver404, resolve, reverse

from .database import get_database_config
from .logging_security import SensitivePathFilter, redact_sensitive_paths


class DatabaseConfigurationTests(SimpleTestCase):
    def setUp(self):
        self.base_dir = Path("/tmp/bubllio-test-src")

    def test_empty_database_url_uses_local_sqlite(self):
        databases = get_database_config(self.base_dir, database_url="")
        self.assertEqual(databases["default"]["ENGINE"], "django.db.backends.sqlite3")
        self.assertEqual(
            databases["default"]["NAME"],
            self.base_dir / "db.sqlite3",
        )

    @patch("bubllio_crm.database.importlib.import_module")
    def test_postgresql_url_is_parsed(self, _):
        databases = get_database_config(
            self.base_dir,
            database_url="postgresql://bubllio:secret@db.example.com:5432/bubllio",
        )
        config = databases["default"]
        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(config["NAME"], "bubllio")
        self.assertEqual(config["USER"], "bubllio")
        self.assertEqual(config["HOST"], "db.example.com")
        self.assertEqual(config["PORT"], 5432)
        self.assertEqual(config["CONN_MAX_AGE"], 60)
        self.assertTrue(config["CONN_HEALTH_CHECKS"])

    @patch("bubllio_crm.database.importlib.import_module", side_effect=ImportError)
    def test_missing_postgresql_driver_has_actionable_error(self, _):
        with self.assertRaisesMessage(
            ImproperlyConfigured,
            "uv sync --extra postgres",
        ):
            get_database_config(
                self.base_dir,
                database_url="postgresql://bubllio:secret@localhost:5432/bubllio",
            )

    def test_unsupported_backend_has_clear_error(self):
        with self.assertRaisesMessage(
            ImproperlyConfigured,
            "currently supports SQLite and PostgreSQL",
        ):
            get_database_config(
                self.base_dir,
                database_url="mysql://bubllio:secret@localhost:3306/bubllio",
            )

    def test_invalid_database_url_has_clear_error(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "DATABASE_URL is invalid"):
            get_database_config(self.base_dir, database_url="not-a-database-url")


class SensitiveLoggingTests(SimpleTestCase):
    def test_redacts_invitation_and_password_reset_credentials(self):
        message = (
            "Failed /api/v1/invitations/invite-secret/accept/ "
            "/api/v1/installation-admin-invitations/admin-secret/ "
            "/api/v1/auth/password-reset/user-id/reset-secret/"
        )

        redacted = redact_sensitive_paths(message)

        self.assertNotIn("invite-secret", redacted)
        self.assertNotIn("admin-secret", redacted)
        self.assertNotIn("reset-secret", redacted)
        self.assertIn("/api/v1/invitations/<redacted>/accept/", redacted)
        self.assertIn("/api/v1/auth/password-reset/<redacted>/", redacted)

    def test_logging_filter_handles_parameterized_messages(self):
        record = logging.LogRecord(
            name="django.request",
            level=logging.WARNING,
            pathname=__file__,
            lineno=1,
            msg="Not Found: %s",
            args=("/api/v1/invitations/secret-token/",),
            exc_info=None,
        )

        self.assertTrue(SensitivePathFilter().filter(record))
        self.assertEqual(record.getMessage(), "Not Found: /api/v1/invitations/<redacted>/")


class HealthCheckTests(TestCase):
    def test_health_check_reports_ready_when_database_is_available(self):
        response = self.client.get(reverse("health-check"))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("version", payload)
        self.assertIn("commit_sha", payload)
        self.assertEqual(payload["schema"], f"bubllio-crm-{payload['version']}")
        self.assertIn("no-store", response["Cache-Control"])

    @patch("bubllio_crm.health.connection.cursor", side_effect=OperationalError)
    def test_health_check_reports_unavailable_when_database_is_down(self, _cursor):
        response = self.client.get(reverse("health-check"))

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable"})

    @patch("bubllio_crm.health.MigrationExecutor")
    def test_health_check_reports_unavailable_when_migrations_are_pending(self, executor):
        executor.return_value.loader.graph.leaf_nodes.return_value = [("companies", "9999_next")]
        executor.return_value.migration_plan.return_value = [object()]

        response = self.client.get(reverse("health-check"))

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable"})


class RemovedFeatureRouteTests(SimpleTestCase):
    def test_automation_api_is_not_routable(self):
        path = f"/api/v1/organizations/{uuid.uuid4()}/automations/"

        with self.assertRaises(Resolver404):
            resolve(path)

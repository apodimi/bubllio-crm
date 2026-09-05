from pathlib import Path
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from .database import get_database_config


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

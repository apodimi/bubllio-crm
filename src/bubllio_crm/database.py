import importlib
import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured


SUPPORTED_ENGINES = {
    "django.db.backends.sqlite3",
    "django.db.backends.postgresql",
}


def get_database_config(base_dir: Path, database_url: str | None = None):
    """Return Django DATABASES settings with zero-config SQLite fallback."""
    if database_url is None:
        database_url = os.environ.get("DATABASE_URL", "")

    database_url = database_url.strip()
    if not database_url:
        return {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": base_dir / "db.sqlite3",
            }
        }

    try:
        config = dj_database_url.parse(
            database_url,
            conn_max_age=60,
            conn_health_checks=True,
        )
    except (dj_database_url.ParseError, dj_database_url.UnknownSchemeError) as exc:
        raise ImproperlyConfigured(
            "DATABASE_URL is invalid. Expected a URL such as "
            "postgresql://USER:PASSWORD@HOST:PORT/DATABASE."
        ) from exc

    engine = config["ENGINE"]
    if engine not in SUPPORTED_ENGINES:
        raise ImproperlyConfigured(
            f"Database backend '{engine}' is not supported yet. "
            "Bubllio CRM currently supports SQLite and PostgreSQL."
        )

    _ensure_database_driver(engine)
    return {"default": config}


def _ensure_database_driver(engine: str):
    if engine != "django.db.backends.postgresql":
        return

    try:
        importlib.import_module("psycopg")
    except ImportError as exc:
        raise ImproperlyConfigured(
            "PostgreSQL support is not installed. "
            "Run 'uv sync --extra postgres' and try again."
        ) from exc

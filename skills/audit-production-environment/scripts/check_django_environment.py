#!/usr/bin/env python3
"""Read-only production configuration audit without exposing secret values."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SRC_ROOT = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bubllio_crm.settings")

import django  # noqa: E402
from django.conf import settings  # noqa: E402
from django.core.checks import run_checks  # noqa: E402


def record(results: list[dict[str, str]], name: str, passed: bool, detail: str) -> None:
    results.append(
        {
            "check": name,
            "status": "PASS" if passed else "FAIL",
            "detail": detail,
        }
    )


def main() -> int:
    django.setup()
    results: list[dict[str, str]] = []

    required_environment = (
        "DJANGO_SECRET_KEY",
        "DATABASE_URL",
        "BUBLLIO_APP_URL",
        "BUBLLIO_EMAIL_ENCRYPTION_KEY",
    )
    for name in required_environment:
        configured = bool(os.environ.get(name))
        record(
            results,
            f"environment:{name}",
            configured,
            "configured" if configured else "missing",
        )

    record(results, "django:DEBUG", not settings.DEBUG, "disabled" if not settings.DEBUG else "enabled")
    allowed_hosts = list(settings.ALLOWED_HOSTS)
    record(
        results,
        "django:ALLOWED_HOSTS",
        bool(allowed_hosts) and "*" not in allowed_hosts,
        "restricted" if allowed_hosts and "*" not in allowed_hosts else "empty or wildcard",
    )
    secure_key = not settings.SECRET_KEY.startswith("django-insecure-") and len(settings.SECRET_KEY) >= 50
    record(
        results,
        "django:SECRET_KEY",
        secure_key,
        "non-development key loaded" if secure_key else "development fallback or weak key loaded",
    )
    is_postgres = settings.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"
    record(results, "django:DATABASES", is_postgres, "PostgreSQL backend" if is_postgres else "not PostgreSQL")
    record(results, "django:SECURE_SSL_REDIRECT", settings.SECURE_SSL_REDIRECT, "enabled" if settings.SECURE_SSL_REDIRECT else "disabled")
    record(results, "django:SESSION_COOKIE_SECURE", settings.SESSION_COOKIE_SECURE, "enabled" if settings.SESSION_COOKIE_SECURE else "disabled")
    record(results, "django:CSRF_COOKIE_SECURE", settings.CSRF_COOKIE_SECURE, "enabled" if settings.CSRF_COOKIE_SECURE else "disabled")
    record(results, "django:SECURE_HSTS_SECONDS", settings.SECURE_HSTS_SECONDS > 0, "enabled" if settings.SECURE_HSTS_SECONDS > 0 else "disabled")
    record(results, "django:STATIC_ROOT", bool(settings.STATIC_ROOT), "configured" if settings.STATIC_ROOT else "missing")
    non_console_email = settings.EMAIL_BACKEND != "django.core.mail.backends.console.EmailBackend"
    record(results, "django:EMAIL_BACKEND", non_console_email, "non-console backend" if non_console_email else "console backend")
    https_app_url = settings.BUBLLIO_APP_URL.startswith("https://")
    record(results, "bubllio:APP_URL", https_app_url, "HTTPS URL" if https_app_url else "missing or non-HTTPS URL")

    for message in run_checks(include_deployment_checks=True):
        record(results, f"django-check:{message.id}", False, str(message.msg))

    failures = sum(item["status"] == "FAIL" for item in results)
    print(
        json.dumps(
            {
                "automated_verdict": "PASS" if failures == 0 else "NO-GO",
                "failures": failures,
                "checks": results,
                "note": "Automated PASS still requires manual evidence gates before GO.",
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

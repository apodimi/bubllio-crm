import platform
from importlib.metadata import PackageNotFoundError, version
from urllib.parse import urlsplit

import django
from django.conf import settings


def get_system_information():
    try:
        application_version = version("bubllio-crm")
    except PackageNotFoundError:
        application_version = "development"

    engine = settings.DATABASES["default"]["ENGINE"]
    database_name = {
        "django.db.backends.sqlite3": "SQLite",
        "django.db.backends.postgresql": "PostgreSQL",
    }.get(engine, "Other")
    email_mode = (
        "Console"
        if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend"
        else "Configured backend"
    )
    public_url = urlsplit(settings.BUBLLIO_APP_URL)
    public_origin = f"{public_url.scheme}://{public_url.netloc}" if public_url.netloc else ""

    return {
        "application_version": application_version,
        "python_version": platform.python_version(),
        "django_version": django.get_version(),
        "database": database_name,
        "email_delivery": email_mode,
        "debug_enabled": settings.DEBUG,
        "update_check_enabled": settings.BUBLLIO_UPDATE_CHECK_ENABLED,
        "public_url": public_origin,
        "runtime": platform.system(),
    }

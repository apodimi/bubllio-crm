import os
from urllib.parse import urlsplit

from cryptography.fernet import Fernet
from django.conf import settings


def _check(key, label, passed, guidance):
    return {
        "key": key,
        "label": label,
        "status": "pass" if passed else "fail",
        "guidance": guidance,
    }


def _has_valid_encryption_key():
    key = os.environ.get("BUBLLIO_EMAIL_ENCRYPTION_KEY", "")
    if not key:
        return False
    try:
        Fernet(key.encode())
    except (TypeError, ValueError):
        return False
    return True


def get_production_readiness():
    secret_key = settings.SECRET_KEY
    allowed_hosts = settings.ALLOWED_HOSTS
    public_url = urlsplit(settings.BUBLLIO_APP_URL)
    proxy_header = getattr(settings, "SECURE_PROXY_SSL_HEADER", None)
    checks = [
        _check(
            "debug_disabled",
            "Debug mode is disabled",
            not settings.DEBUG,
            "Set DEBUG=false in the production Django settings.",
        ),
        _check(
            "secret_key",
            "Django secret key is production-safe",
            len(secret_key) >= 50
            and len(set(secret_key)) >= 5
            and not secret_key.startswith("django-insecure-"),
            "Set DJANGO_SECRET_KEY to a unique random value of at least 50 characters.",
        ),
        _check(
            "allowed_hosts",
            "Allowed hosts are restricted",
            bool(allowed_hosts) and "*" not in allowed_hosts,
            "Set ALLOWED_HOSTS to the exact hostnames that serve this installation.",
        ),
        _check(
            "public_url_https",
            "Public application URL uses HTTPS",
            public_url.scheme == "https" and bool(public_url.netloc),
            "Set BUBLLIO_APP_URL to the public https:// URL of this installation.",
        ),
        _check(
            "https_redirect",
            "HTTPS enforcement is configured",
            settings.SECURE_SSL_REDIRECT or bool(proxy_header),
            "Enable SECURE_SSL_REDIRECT or configure SECURE_PROXY_SSL_HEADER behind a trusted proxy.",
        ),
        _check(
            "secure_session_cookie",
            "Session cookies require HTTPS",
            settings.SESSION_COOKIE_SECURE,
            "Set SESSION_COOKIE_SECURE=true in production.",
        ),
        _check(
            "secure_csrf_cookie",
            "CSRF cookies require HTTPS",
            settings.CSRF_COOKIE_SECURE,
            "Set CSRF_COOKIE_SECURE=true in production.",
        ),
        _check(
            "hsts",
            "HTTP Strict Transport Security is enabled",
            settings.SECURE_HSTS_SECONDS > 0,
            "Enable HSTS in Django or at the HTTPS proxy after confirming the site is HTTPS-only.",
        ),
        _check(
            "hsts_subdomains",
            "HSTS includes subdomains",
            settings.SECURE_HSTS_INCLUDE_SUBDOMAINS,
            "Enable HSTS includeSubDomains only after confirming every subdomain is HTTPS-only.",
        ),
        _check(
            "hsts_preload",
            "HSTS preload is enabled",
            settings.SECURE_HSTS_PRELOAD,
            "Enable HSTS preload only after reviewing its long-lived browser commitment.",
        ),
        _check(
            "email_encryption_key",
            "Email credential encryption key is configured",
            _has_valid_encryption_key(),
            "Set BUBLLIO_EMAIL_ENCRYPTION_KEY to a valid Fernet key before storing SMTP credentials.",
        ),
    ]
    passed = sum(check["status"] == "pass" for check in checks)
    return {
        "ready": passed == len(checks),
        "passed": passed,
        "total": len(checks),
        "checks": checks,
    }

import os
from urllib.parse import urlsplit

from cryptography.fernet import Fernet
from django.conf import settings


def _check(key, label, meaning, passed, guidance):
    return {
        "key": key,
        "label": label,
        "meaning": meaning,
        "status": "pass" if passed else "fail",
        "guidance": guidance,
    }


def _has_valid_encryption_key():
    key_ring = os.environ.get("BUBLLIO_EMAIL_ENCRYPTION_KEYS", "").strip()
    legacy_key = os.environ.get("BUBLLIO_EMAIL_ENCRYPTION_KEY", "").strip()
    keys = [key.strip() for key in key_ring.split(",") if key.strip()]
    if not keys and legacy_key:
        keys = [legacy_key]
    if not keys:
        return False
    try:
        for key in keys:
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
            "Detailed error pages are hidden",
            "Prevents visitors from seeing internal application details when something goes wrong.",
            not settings.DEBUG,
            "Set DJANGO_DEBUG=false on the server, then restart Bubllio.",
        ),
        _check(
            "secret_key",
            "The application signing key is safe",
            "Protects sign-ins, password reset links, and other signed information.",
            len(secret_key) >= 50
            and len(set(secret_key)) >= 5
            and not secret_key.startswith("django-insecure-"),
            "Create a unique random value of at least 50 characters, save it as DJANGO_SECRET_KEY, and restart Bubllio.",
        ),
        _check(
            "allowed_hosts",
            "Only approved web addresses can open the app",
            "Blocks requests that use an unexpected domain name.",
            bool(allowed_hosts) and "*" not in allowed_hosts,
            "Set DJANGO_ALLOWED_HOSTS to the domains that serve Bubllio, separated by commas. Do not use *.",
        ),
        _check(
            "public_url_https",
            "Emails and links use the secure public address",
            "Ensures invitations and password reset links point to the real HTTPS website.",
            public_url.scheme == "https" and bool(public_url.netloc),
            "Set BUBLLIO_APP_URL to the full public address beginning with https://, then restart Bubllio.",
        ),
        _check(
            "https_redirect",
            "Unsecured visits are sent to HTTPS",
            "Keeps passwords and CRM data encrypted while travelling over the network.",
            settings.SECURE_SSL_REDIRECT or bool(proxy_header),
            "Enable DJANGO_SECURE_SSL_REDIRECT, or configure DJANGO_TRUST_X_FORWARDED_PROTO when a trusted proxy handles HTTPS.",
        ),
        _check(
            "secure_session_cookie",
            "Sign-in cookies travel only over HTTPS",
            "Reduces the chance that somebody can steal an active sign-in session.",
            settings.SESSION_COOKIE_SECURE,
            "Set DJANGO_SESSION_COOKIE_SECURE=true and restart Bubllio.",
        ),
        _check(
            "secure_csrf_cookie",
            "Form protection cookies travel only over HTTPS",
            "Helps protect users when they save settings or submit forms.",
            settings.CSRF_COOKIE_SECURE,
            "Set DJANGO_CSRF_COOKIE_SECURE=true and restart Bubllio.",
        ),
        _check(
            "hsts",
            "Browsers remember to use HTTPS",
            "Tells browsers to avoid unsecured connections to this installation.",
            settings.SECURE_HSTS_SECONDS > 0,
            "After confirming the site works only through HTTPS, set DJANGO_SECURE_HSTS_SECONDS=31536000.",
        ),
        _check(
            "hsts_subdomains",
            "HTTPS protection includes subdomains",
            "Extends the browser HTTPS rule to every subdomain of the public domain.",
            settings.SECURE_HSTS_INCLUDE_SUBDOMAINS,
            "Only when every subdomain is HTTPS-only, set DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=true.",
        ),
        _check(
            "hsts_preload",
            "Browser preload protection is enabled",
            "Allows supported browsers to know the domain requires HTTPS before the first visit.",
            settings.SECURE_HSTS_PRELOAD,
            "Review the long-term HTTPS commitment first, then set DJANGO_SECURE_HSTS_PRELOAD=true.",
        ),
        _check(
            "email_encryption_key",
            "Saved email passwords can be encrypted",
            "Protects SMTP passwords stored in the database.",
            _has_valid_encryption_key(),
            "Generate a Fernet key, store it as BUBLLIO_EMAIL_ENCRYPTION_KEYS, and keep a secure copy outside the server.",
        ),
    ]
    passed = sum(check["status"] == "pass" for check in checks)
    return {
        "ready": passed == len(checks),
        "passed": passed,
        "total": len(checks),
        "checks": checks,
    }

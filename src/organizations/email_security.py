import importlib
import os

from django.core.exceptions import ImproperlyConfigured


def _fernet():
    try:
        Fernet = importlib.import_module("cryptography.fernet").Fernet
    except ImportError as exc:
        raise ImproperlyConfigured(
            "Email credential encryption is unavailable. Run 'uv sync'."
        ) from exc

    key = os.environ.get("BUBLLIO_EMAIL_ENCRYPTION_KEY", "").strip()
    if not key:
        raise ImproperlyConfigured(
            "BUBLLIO_EMAIL_ENCRYPTION_KEY is required to create or use an email account. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    try:
        return Fernet(key.encode())
    except (ValueError, TypeError) as exc:
        raise ImproperlyConfigured(
            "BUBLLIO_EMAIL_ENCRYPTION_KEY must be a valid Fernet key."
        ) from exc


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except Exception as exc:
        raise ImproperlyConfigured(
            "The email account credential could not be decrypted. Check the encryption key."
        ) from exc

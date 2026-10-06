import importlib
import os

from django.core.exceptions import ImproperlyConfigured


def _fernet():
    try:
        fernet_module = importlib.import_module("cryptography.fernet")
    except ImportError as exc:
        raise ImproperlyConfigured(
            "Email credential encryption is unavailable. Run 'uv sync'."
        ) from exc

    key_ring = os.environ.get("BUBLLIO_EMAIL_ENCRYPTION_KEYS", "").strip()
    legacy_key = os.environ.get("BUBLLIO_EMAIL_ENCRYPTION_KEY", "").strip()
    keys = [key.strip() for key in key_ring.split(",") if key.strip()]
    if not keys and legacy_key:
        keys = [legacy_key]
    if not keys:
        raise ImproperlyConfigured(
            "BUBLLIO_EMAIL_ENCRYPTION_KEYS or BUBLLIO_EMAIL_ENCRYPTION_KEY is required "
            "to create or use an email account. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    try:
        fernets = [fernet_module.Fernet(key.encode()) for key in keys]
    except (ValueError, TypeError) as exc:
        raise ImproperlyConfigured(
            "Every configured email encryption key must be a valid Fernet key."
        ) from exc
    return fernet_module.MultiFernet(fernets), len(fernets)


def encrypt_secret(value: str) -> str:
    fernet, _ = _fernet()
    return fernet.encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    try:
        fernet, _ = _fernet()
        return fernet.decrypt(value.encode()).decode()
    except Exception as exc:
        raise ImproperlyConfigured(
            "The email account credential could not be decrypted. Check the encryption key."
        ) from exc


def email_encryption_key_count() -> int:
    _, key_count = _fernet()
    return key_count


def rotate_secret(value: str) -> str:
    fernet, key_count = _fernet()
    if key_count < 2:
        raise ImproperlyConfigured(
            "Configure a new primary key and the previous key in "
            "BUBLLIO_EMAIL_ENCRYPTION_KEYS before rotating credentials."
        )
    try:
        return fernet.rotate(value.encode()).decode()
    except Exception as exc:
        raise ImproperlyConfigured(
            "An email account credential could not be rotated. Check the encryption key ring."
        ) from exc

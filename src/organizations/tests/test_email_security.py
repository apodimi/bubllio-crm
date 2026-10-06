from io import StringIO
from unittest.mock import patch

from cryptography.fernet import Fernet, InvalidToken
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from organizations.models import EmailAccount, Organization
from organizations.services.email_security import decrypt_secret, encrypt_secret


class EmailEncryptionRotationTests(TestCase):
    def setUp(self):
        self.old_key = Fernet.generate_key().decode()
        self.new_key = Fernet.generate_key().decode()

    def test_key_ring_decrypts_legacy_value_and_encrypts_with_primary_key(self):
        with patch.dict(
            "os.environ",
            {"BUBLLIO_EMAIL_ENCRYPTION_KEY": self.old_key},
            clear=False,
        ):
            legacy_value = encrypt_secret("legacy-secret")

        with patch.dict(
            "os.environ",
            {
                "BUBLLIO_EMAIL_ENCRYPTION_KEYS": f"{self.new_key},{self.old_key}",
                "BUBLLIO_EMAIL_ENCRYPTION_KEY": "",
            },
            clear=False,
        ):
            self.assertEqual(decrypt_secret(legacy_value), "legacy-secret")
            current_value = encrypt_secret("current-secret")

        self.assertEqual(
            Fernet(self.new_key.encode()).decrypt(current_value.encode()).decode(),
            "current-secret",
        )

    def test_rotation_command_requires_new_and_previous_keys(self):
        with patch.dict(
            "os.environ",
            {
                "BUBLLIO_EMAIL_ENCRYPTION_KEYS": self.new_key,
                "BUBLLIO_EMAIL_ENCRYPTION_KEY": "",
            },
            clear=False,
        ):
            with self.assertRaisesMessage(CommandError, "previous key"):
                call_command("rotate_email_encryption")

    def test_rotation_command_reencrypts_credentials_with_primary_key(self):
        organization = Organization.objects.create(name="Example", slug="example")
        encrypted = Fernet(self.old_key.encode()).encrypt(b"smtp-secret").decode()
        account = EmailAccount.objects.create(
            organization=organization,
            name="Primary",
            host="smtp.example.com",
            username="mailer@example.com",
            encrypted_password=encrypted,
            from_email="mailer@example.com",
        )

        output = StringIO()
        with patch.dict(
            "os.environ",
            {
                "BUBLLIO_EMAIL_ENCRYPTION_KEYS": f"{self.new_key},{self.old_key}",
                "BUBLLIO_EMAIL_ENCRYPTION_KEY": "",
            },
            clear=False,
        ):
            call_command("rotate_email_encryption", stdout=output)

        account.refresh_from_db()
        self.assertEqual(
            Fernet(self.new_key.encode())
            .decrypt(account.encrypted_password.encode())
            .decode(),
            "smtp-secret",
        )
        with self.assertRaises(InvalidToken):
            Fernet(self.old_key.encode()).decrypt(account.encrypted_password.encode())
        self.assertIn("Rotated 1 email credential", output.getvalue())

    def test_rotation_rolls_back_every_account_when_one_value_is_invalid(self):
        organization = Organization.objects.create(name="Example", slug="example")
        valid_value = Fernet(self.old_key.encode()).encrypt(b"smtp-secret").decode()
        valid = EmailAccount.objects.create(
            organization=organization,
            name="Primary",
            host="smtp.example.com",
            username="primary@example.com",
            encrypted_password=valid_value,
            from_email="primary@example.com",
        )
        invalid = EmailAccount.objects.create(
            organization=organization,
            name="Invalid",
            host="smtp.example.com",
            username="invalid@example.com",
            encrypted_password="not-a-fernet-token",
            from_email="invalid@example.com",
        )

        with patch.dict(
            "os.environ",
            {
                "BUBLLIO_EMAIL_ENCRYPTION_KEYS": f"{self.new_key},{self.old_key}",
                "BUBLLIO_EMAIL_ENCRYPTION_KEY": "",
            },
            clear=False,
        ):
            with self.assertRaises(CommandError):
                call_command("rotate_email_encryption")

        valid.refresh_from_db()
        invalid.refresh_from_db()
        self.assertEqual(valid.encrypted_password, valid_value)
        self.assertEqual(invalid.encrypted_password, "not-a-fernet-token")

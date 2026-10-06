from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from organizations.models import EmailAccount
from organizations.services.email_security import (
    email_encryption_key_count,
    rotate_secret,
)


class Command(BaseCommand):
    help = "Re-encrypt every saved SMTP password with the primary Fernet key."

    @transaction.atomic
    def handle(self, *args, **options):
        rotated = 0
        try:
            if email_encryption_key_count() < 2:
                raise ImproperlyConfigured(
                    "Configure a new primary key and the previous key in "
                    "BUBLLIO_EMAIL_ENCRYPTION_KEYS before rotating credentials."
                )
            accounts = EmailAccount.objects.select_for_update().order_by("id")
            for account in accounts:
                account.encrypted_password = rotate_secret(account.encrypted_password)
                account.save(update_fields=("encrypted_password", "updated_at"))
                rotated += 1
        except ImproperlyConfigured as exc:
            raise CommandError(str(exc)) from exc

        label = "credential" if rotated == 1 else "credentials"
        self.stdout.write(self.style.SUCCESS(f"Rotated {rotated} email {label}."))

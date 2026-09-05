from django.core.mail import EmailMessage, get_connection
from django.utils import timezone

from .email_security import decrypt_secret
from .models import EmailAccount


def send_test_email(*, account: EmailAccount, recipient: str):
    connection = get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=account.host,
        port=account.port,
        username=account.username,
        password=decrypt_secret(account.encrypted_password),
        use_tls=account.use_tls,
        use_ssl=account.use_ssl,
        timeout=10,
        fail_silently=False,
    )
    from_email = account.from_email
    if account.from_name:
        from_email = f"{account.from_name} <{account.from_email}>"
    message = EmailMessage(
        subject="Bubllio CRM email configuration test",
        body="This is a test email from Bubllio CRM.",
        from_email=from_email,
        to=[recipient],
        connection=connection,
    )
    message.send(fail_silently=False)


def mark_test_success(account):
    account.last_tested_at = timezone.now()
    account.last_test_error = ""
    account.save(update_fields=("last_tested_at", "last_test_error", "updated_at"))


def mark_test_failure(account, error):
    account.last_test_error = str(error)[:2000]
    account.save(update_fields=("last_test_error", "updated_at"))

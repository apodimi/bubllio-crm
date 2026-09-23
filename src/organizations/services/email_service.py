from django.core.mail import EmailMessage, get_connection
from django.utils import timezone

from .email_security import decrypt_secret
from ..models import EmailAccount


def send_setup_test_email(*, smtp, recipient):
    """Send a real test email with unsaved first-run SMTP settings."""
    connection = get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=smtp["host"],
        port=smtp["port"],
        username=smtp["username"],
        password=smtp["password"],
        use_tls=smtp.get("use_tls", True),
        use_ssl=smtp.get("use_ssl", False),
        timeout=10,
        fail_silently=False,
    )
    from_email = smtp["from_email"]
    if smtp.get("from_name"):
        from_email = f'{smtp["from_name"]} <{from_email}>'
    message = EmailMessage(
        subject="Bubllio CRM setup test email",
        body="Your SMTP settings sent this test email successfully. You can finish setting up Bubllio CRM.",
        from_email=from_email,
        to=[recipient],
        connection=connection,
    )
    if message.send(fail_silently=False) != 1:
        raise RuntimeError("SMTP test email was not accepted for delivery.")


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


def send_invitation_email(
    *, account: EmailAccount, recipient: str, organization_name: str,
    invite_url: str, initial_owner: bool = False,
):
    """Send an invitation through the organization's default SMTP account."""
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
    sender = f"{account.from_name} <{account.from_email}>" if account.from_name else account.from_email
    invitation_line = (
        f"You have been invited to become the owner of {organization_name} on Bubllio CRM."
        if initial_owner
        else f"You have been invited to join {organization_name} on Bubllio CRM."
    )
    message = EmailMessage(
        subject=(
            f"Own {organization_name} on Bubllio CRM"
            if initial_owner else f"Join {organization_name} on Bubllio CRM"
        ),
        body=(
            f"{invitation_line}\n\n"
            f"Accept your invitation: {invite_url}\n\n"
            "This link expires in 7 days. If you were not expecting this invitation, ignore this email."
        ),
        from_email=sender,
        to=[recipient],
        connection=connection,
    )
    if message.send(fail_silently=False) != 1:
        raise RuntimeError("Invitation email was not accepted for delivery.")


def send_installation_admin_invitation_email(*, account: EmailAccount, recipient: str, invite_url: str):
    """Send an explicit invitation to administer this Bubllio installation."""
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
    sender = f"{account.from_name} <{account.from_email}>" if account.from_name else account.from_email
    message = EmailMessage(
        subject="Bubllio CRM installation administrator invitation",
        body=(
            "You have been invited to administer this Bubllio CRM installation. "
            "This grants access to installation settings and the ability to create workspaces "
            "and invite other installation administrators. It does not automatically grant "
            "access to workspace CRM data.\n\n"
            f"Accept your invitation: {invite_url}\n\n"
            "This link expires in 7 days. If you were not expecting it, ignore this email."
        ),
        from_email=sender,
        to=[recipient],
        connection=connection,
    )
    if message.send(fail_silently=False) != 1:
        raise RuntimeError("Installation administrator invitation email was not accepted for delivery.")


def send_password_reset_email(*, account: EmailAccount, recipient: str, reset_url: str):
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
    sender = f"{account.from_name} <{account.from_email}>" if account.from_name else account.from_email
    message = EmailMessage(
        subject="Reset your Bubllio CRM password",
        body=f"Reset your password here: {reset_url}\n\nIf you did not request this, ignore this email.",
        from_email=sender,
        to=[recipient],
        connection=connection,
    )
    if message.send(fail_silently=False) != 1:
        raise RuntimeError("Password reset email was not accepted for delivery.")


def mark_test_success(account):
    account.last_tested_at = timezone.now()
    account.last_test_error = ""
    account.save(update_fields=("last_tested_at", "last_test_error", "updated_at"))


def mark_test_failure(account, error):
    account.last_test_error = str(error)[:2000]
    account.save(update_fields=("last_test_error", "updated_at"))

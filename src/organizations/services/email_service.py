from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.utils import timezone

from ..models import EmailAccount
from .email_security import decrypt_secret


def _smtp_connection(*, host, port, username, password, use_tls, use_ssl):
    return get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=host,
        port=port,
        username=username,
        password=password,
        use_tls=use_tls,
        use_ssl=use_ssl,
        timeout=10,
        fail_silently=False,
    )


def _account_connection(account):
    return _smtp_connection(
        host=account.host,
        port=account.port,
        username=account.username,
        password=decrypt_secret(account.encrypted_password),
        use_tls=account.use_tls,
        use_ssl=account.use_ssl,
    )


def _account_sender(account):
    if account.from_name:
        return f"{account.from_name} <{account.from_email}>"
    return account.from_email


def render_transactional_email(
    *, subject, preheader, eyebrow, heading, message, notice, action_url="", action_label=""
):
    context = {
        "subject": subject,
        "preheader": preheader,
        "eyebrow": eyebrow,
        "heading": heading,
        "message": message,
        "notice": notice,
        "action_url": action_url,
        "action_label": action_label,
    }
    return (
        render_to_string("emails/transactional.txt", context).strip(),
        render_to_string("emails/transactional.html", context),
    )


def _send_transactional_email(
    *,
    subject,
    preheader,
    eyebrow,
    heading,
    message,
    notice,
    recipient,
    from_email,
    failure_message,
    connection=None,
    action_url="",
    action_label="",
):
    text_body, html_body = render_transactional_email(
        subject=subject,
        preheader=preheader,
        eyebrow=eyebrow,
        heading=heading,
        message=message,
        notice=notice,
        action_url=action_url,
        action_label=action_label,
    )
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email,
        to=[recipient],
        connection=connection,
    )
    email.attach_alternative(html_body, "text/html")
    if email.send(fail_silently=False) != 1:
        raise RuntimeError(failure_message)


def send_setup_test_email(*, smtp, recipient):
    """Send a real test email with unsaved first-run SMTP settings."""
    connection = _smtp_connection(
        host=smtp["host"],
        port=smtp["port"],
        username=smtp["username"],
        password=smtp["password"],
        use_tls=smtp.get("use_tls", True),
        use_ssl=smtp.get("use_ssl", False),
    )
    from_email = smtp["from_email"]
    if smtp.get("from_name"):
        from_email = f'{smtp["from_name"]} <{from_email}>'
    _send_transactional_email(
        subject="Bubllio CRM setup test email",
        preheader="Your Bubllio CRM email connection is working.",
        eyebrow="Email setup",
        heading="Your email connection works",
        message=(
            "Your SMTP settings sent this test email successfully. "
            "You can finish setting up Bubllio CRM."
        ),
        notice=(
            "The SMTP server accepted this message. Inbox delivery still depends on your provider."
        ),
        recipient=recipient,
        from_email=from_email,
        connection=connection,
        failure_message="SMTP test email was not accepted for delivery.",
    )


def send_test_email(*, account: EmailAccount, recipient: str):
    _send_transactional_email(
        subject="Bubllio CRM email configuration test",
        preheader="Your saved Bubllio CRM email account is working.",
        eyebrow="Email settings",
        heading="Test email delivered",
        message="This is a test email from your saved Bubllio CRM email account.",
        notice=(
            "The SMTP server accepted this message. Inbox delivery still depends on your provider."
        ),
        recipient=recipient,
        from_email=_account_sender(account),
        connection=_account_connection(account),
        failure_message="Test email was not accepted for delivery.",
    )


def send_invitation_email(
    *,
    account: EmailAccount,
    recipient: str,
    organization_name: str,
    invite_url: str,
    initial_owner: bool = False,
):
    """Send an invitation through the organization's default SMTP account."""
    if initial_owner:
        subject = f"Own {organization_name} on Bubllio CRM"
        heading = f"Take ownership of {organization_name}"
        message = (
            f"You have been invited to become the owner of {organization_name} on Bubllio CRM."
        )
    else:
        subject = f"Join {organization_name} on Bubllio CRM"
        heading = f"You are invited to {organization_name}"
        message = f"You have been invited to join {organization_name} on Bubllio CRM."
    _send_transactional_email(
        subject=subject,
        preheader=f"Accept your invitation to {organization_name}.",
        eyebrow="Workspace invitation",
        heading=heading,
        message=message,
        notice=(
            "This secure link expires in 7 days. If you were not expecting this invitation, "
            "you can safely ignore this email."
        ),
        action_url=invite_url,
        action_label="Accept invitation",
        recipient=recipient,
        from_email=_account_sender(account),
        connection=_account_connection(account),
        failure_message="Invitation email was not accepted for delivery.",
    )


def send_installation_admin_invitation_email(
    *, account: EmailAccount, recipient: str, invite_url: str
):
    """Send an explicit invitation to administer this Bubllio installation."""
    _send_transactional_email(
        subject="Bubllio CRM installation administrator invitation",
        preheader="You have been invited to administer this Bubllio CRM installation.",
        eyebrow="Administrator invitation",
        heading="Administer this Bubllio installation",
        message=(
            "You have been invited to manage installation settings, create workspaces, and "
            "invite other installation administrators. This does not automatically grant "
            "access to workspace CRM data."
        ),
        notice=(
            "This secure link expires in 7 days. If you were not expecting this invitation, "
            "you can safely ignore this email."
        ),
        action_url=invite_url,
        action_label="Accept admin invitation",
        recipient=recipient,
        from_email=_account_sender(account),
        connection=_account_connection(account),
        failure_message=(
            "Installation administrator invitation email was not accepted for delivery."
        ),
    )


def send_password_reset_email(
    *, account: EmailAccount | None, recipient: str, reset_url: str
):
    _send_transactional_email(
        subject="Reset your Bubllio CRM password",
        preheader="Use this secure link to reset your Bubllio CRM password.",
        eyebrow="Account security",
        heading="Reset your password",
        message="We received a request to reset the password for your Bubllio CRM account.",
        notice=(
            "If you did not request a password reset, you can safely ignore this email. "
            "Your password will remain unchanged."
        ),
        action_url=reset_url,
        action_label="Reset password",
        recipient=recipient,
        from_email=_account_sender(account) if account else settings.DEFAULT_FROM_EMAIL,
        connection=_account_connection(account) if account else None,
        failure_message="Password reset email was not accepted for delivery.",
    )


def mark_test_success(account):
    account.last_tested_at = timezone.now()
    account.last_test_error = ""
    account.save(update_fields=("last_tested_at", "last_test_error", "updated_at"))


def mark_test_failure(account, error):
    account.last_test_error = str(error)[:2000]
    account.save(update_fields=("last_test_error", "updated_at"))

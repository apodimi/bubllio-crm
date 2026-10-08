import logging
from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from organizations.services.email_security import decrypt_secret

from .models import OutboxMessage

logger = logging.getLogger(__name__)
LOCK_TIMEOUT = timedelta(minutes=15)
MAX_ATTEMPTS = 6


def _claim(message_id):
    with transaction.atomic():
        message = OutboxMessage.objects.select_for_update().get(id=message_id)
        if message.status in {OutboxMessage.Status.SENT, OutboxMessage.Status.FAILED}:
            return None
        if (
            message.status == OutboxMessage.Status.PROCESSING
            and message.locked_at
            and message.locked_at > timezone.now() - LOCK_TIMEOUT
        ):
            return None
        message.status = OutboxMessage.Status.PROCESSING
        message.locked_at = timezone.now()
        message.attempts += 1
        message.last_error = ""
        message.save(
            update_fields=("status", "locked_at", "attempts", "last_error", "updated_at")
        )
        return message


def _send(message):
    from access.services.invitations import invitation_email_account
    from automations.services import execute_automation_run
    from automations.models import AutomationRun
    from organizations.models import (
        EmailAccount,
        InstallationAdminInvitation,
        OrganizationInvitation,
    )
    from organizations.services.email_service import (
        send_installation_admin_invitation_email,
        send_invitation_email,
        send_password_reset_email,
    )

    payload = message.payload
    if message.kind in {
        OutboxMessage.Kind.WORKSPACE_INVITATION,
        OutboxMessage.Kind.OWNER_INVITATION,
    }:
        invitation = OrganizationInvitation.objects.select_related("organization").get(
            id=payload["invitation_id"]
        )
        if invitation.status != OrganizationInvitation.Status.PENDING:
            return
        account = invitation_email_account(invitation.organization)
        if account is None:
            raise RuntimeError("No active SMTP account is available for this invitation.")
        token = decrypt_secret(message.encrypted_data)
        send_invitation_email(
            account=account,
            recipient=invitation.email,
            organization_name=invitation.organization.name,
            invite_url=f'{payload["app_url"]}/invite/{token}',
            initial_owner=message.kind == OutboxMessage.Kind.OWNER_INVITATION,
        )
        return
    if message.kind == OutboxMessage.Kind.INSTALLATION_ADMIN_INVITATION:
        invitation = InstallationAdminInvitation.objects.get(id=payload["invitation_id"])
        if invitation.accepted_at is not None or invitation.expires_at <= timezone.now():
            return
        account = EmailAccount.objects.filter(id=payload["account_id"], is_active=True).first()
        if account is None:
            raise RuntimeError("The installation SMTP account is unavailable.")
        token = decrypt_secret(message.encrypted_data)
        send_installation_admin_invitation_email(
            account=account,
            recipient=invitation.email,
            invite_url=f'{payload["app_url"]}/installation-admin-invite/{token}',
        )
        return
    if message.kind == OutboxMessage.Kind.PASSWORD_RESET:
        from django.conf import settings
        from django.contrib.auth import get_user_model
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from organizations.models import InstallationState

        user = get_user_model().objects.get(id=payload["user_id"], is_active=True)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f'{settings.BUBLLIO_APP_URL.rstrip("/")}/reset-password/{uid}/{token}'
        account_id = InstallationState.objects.values_list(
            "fallback_email_account_id", flat=True
        ).first()
        account = EmailAccount.objects.filter(id=account_id, is_active=True).first()
        send_password_reset_email(account=account, recipient=user.email, reset_url=reset_url)
        return
    if message.kind == OutboxMessage.Kind.AUTOMATION_RUN:
        run = AutomationRun.objects.select_related("automation").get(id=payload["run_id"])
        execute_automation_run(run)
        return
    raise RuntimeError(f"Unsupported outbox message kind: {message.kind}")


@shared_task(bind=True, max_retries=5, acks_late=True, reject_on_worker_lost=True)
def deliver_outbox_message(self, message_id):
    message = _claim(message_id)
    if message is None:
        return
    try:
        _send(message)
    except Exception as exc:
        terminal = message.attempts >= MAX_ATTEMPTS
        delay = min(60 * (2 ** (message.attempts - 1)), 3600)
        OutboxMessage.objects.filter(id=message.id).update(
            status=OutboxMessage.Status.FAILED if terminal else OutboxMessage.Status.QUEUED,
            available_at=timezone.now() + timedelta(seconds=delay),
            locked_at=None,
            last_error=str(exc)[:2000],
        )
        if terminal:
            raise
        raise self.retry(exc=exc, countdown=delay)
    OutboxMessage.objects.filter(id=message.id).update(
        status=OutboxMessage.Status.SENT,
        sent_at=timezone.now(),
        locked_at=None,
        last_error="",
        encrypted_data="",
    )


@shared_task
def dispatch_pending_outbox():
    stale_before = timezone.now() - LOCK_TIMEOUT
    OutboxMessage.objects.filter(
        status=OutboxMessage.Status.PROCESSING,
        locked_at__lt=stale_before,
    ).update(status=OutboxMessage.Status.QUEUED, locked_at=None)
    message_ids = list(OutboxMessage.objects.filter(
        status=OutboxMessage.Status.QUEUED,
        available_at__lte=timezone.now(),
    ).values_list("id", flat=True)[:500])
    for message_id in message_ids:
        deliver_outbox_message.delay(str(message_id))

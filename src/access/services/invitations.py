import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from organizations.models import (
    EmailAccount,
    InstallationState,
    Organization,
    OrganizationInvitation,
    OrganizationMembership,
    WorkspaceAccessEvent,
)
from delivery.models import OutboxMessage
from delivery.services import queue_outbox_message


class InvitationRolePermissionError(Exception):
    """Raised when an administrator action would replace an owner-managed invitation."""


class InvitationAlreadyMemberError(Exception):
    """Raised when the recipient joined while an invitation action was waiting for a lock."""


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def invitation_email_account(organization):
    account = EmailAccount.objects.filter(
        organization=organization,
        is_default=True,
        is_active=True,
    ).first()
    if account is not None:
        return account
    fallback_id = InstallationState.objects.values_list(
        "fallback_email_account_id", flat=True
    ).first()
    return (
        EmailAccount.objects.filter(id=fallback_id, is_active=True).first()
        if fallback_id
        else None
    )


def deliver_workspace_invitation(
    *, organization, email, role, actor, actor_role, account, audit_action,
    outbox_kind=OutboxMessage.Kind.WORKSPACE_INVITATION,
):
    """Create and queue a fresh invitation while invalidating older active links."""
    token = secrets.token_urlsafe(32)
    base_url = settings.BUBLLIO_APP_URL.rstrip("/")
    now = timezone.now()

    with transaction.atomic():
        Organization.objects.select_for_update().get(pk=organization.pk)
        if organization.memberships.filter(user__email__iexact=email).exists():
            raise InvitationAlreadyMemberError
        active_invitations = OrganizationInvitation.objects.filter(
            organization=organization,
            email__iexact=email,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
        )
        if (
            actor_role == OrganizationMembership.Role.ADMIN
            and active_invitations.filter(
                role__in=(OrganizationMembership.Role.ADMIN, OrganizationMembership.Role.OWNER)
            ).exists()
        ):
            raise InvitationRolePermissionError
        active_invitations.update(revoked_at=now)
        invitation = OrganizationInvitation.objects.create(
            organization=organization,
            email=email,
            role=role,
            token_hash=token_hash(token),
            invited_by=actor,
            expires_at=now + timedelta(days=7),
        )
        queue_outbox_message(
            kind=outbox_kind,
            payload={
                "invitation_id": str(invitation.id),
                "account_id": str(account.id),
                "app_url": base_url,
            },
            secret=token,
        )
        WorkspaceAccessEvent.objects.create(
            action=audit_action,
            actor=actor,
            organization_id=organization.id,
            details={"email": email, "role": role, "invitation_id": str(invitation.id)},
        )
    return invitation

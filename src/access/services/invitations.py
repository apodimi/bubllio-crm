import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from organizations.models import (
    Organization,
    OrganizationInvitation,
    OrganizationMembership,
    WorkspaceAccessEvent,
)
from organizations.services.email_service import send_invitation_email


class InvitationRolePermissionError(Exception):
    """Raised when an administrator action would replace an owner-managed invitation."""


class InvitationAlreadyMemberError(Exception):
    """Raised when the recipient joined while an invitation action was waiting for a lock."""


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def deliver_workspace_invitation(
    *, organization, email, role, actor, actor_role, account, audit_action
):
    """Create and deliver a fresh invitation while invalidating older active links."""
    token = secrets.token_urlsafe(32)
    base_url = settings.BUBLLIO_APP_URL.rstrip("/")
    invite_url = f"{base_url}/invite/{token}"
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
        send_invitation_email(
            account=account,
            recipient=email,
            organization_name=organization.name,
            invite_url=invite_url,
        )
        WorkspaceAccessEvent.objects.create(
            action=audit_action,
            actor=actor,
            organization_id=organization.id,
            details={"email": email, "role": role, "invitation_id": str(invitation.id)},
        )
    return invitation

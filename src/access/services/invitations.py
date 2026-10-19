import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserProfile

from organizations.models import (
    EmailAccount,
    InstallationState,
    Organization,
    OrganizationInvitation,
    OrganizationMembership,
    OrganizationProvisioning,
    WorkspaceAccessEvent,
)
from delivery.models import OutboxMessage
from delivery.services import queue_outbox_message


class InvitationRolePermissionError(Exception):
    """Raised when an administrator action would replace an owner-managed invitation."""


class InvitationAlreadyMemberError(Exception):
    """Raised when the recipient joined while an invitation action was waiting for a lock."""


class InvitationAcceptanceError(Exception):
    def __init__(self, detail: str, *, status_code: int):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


@dataclass(frozen=True)
class InvitationAcceptanceResult:
    organization_id: UUID
    role: str
    membership_created: bool
    tokens: dict[str, str] | None


def _invited_user(*, invitation, authenticated_user, registration_data):
    user_model = get_user_model()
    if authenticated_user.is_authenticated:
        if authenticated_user.email.lower() != invitation.email:
            raise InvitationAcceptanceError(
                "Sign in with the invited email address.", status_code=403
            )
        return authenticated_user, None

    if user_model.objects.filter(email__iexact=invitation.email).exists():
        raise InvitationAcceptanceError(
            "An account with this email exists. Sign in before accepting the invitation.",
            status_code=409,
        )
    user = user_model.objects.create_user(
        username=registration_data["username"],
        email=invitation.email,
        password=registration_data["password"],
    )
    UserProfile.objects.create(
        user=user,
        display_name=registration_data["display_name"],
        first_name=registration_data.get("first_name", ""),
        last_name=registration_data.get("last_name", ""),
        date_of_birth=registration_data.get("date_of_birth"),
        timezone=registration_data.get("timezone", "UTC"),
        locale=registration_data.get("locale", "en-us"),
        onboarding_completed_at=timezone.now(),
    )
    refresh = RefreshToken.for_user(user)
    return user, {"access": str(refresh.access_token), "refresh": str(refresh)}


@transaction.atomic
def accept_workspace_invitation(
    *, token: str, authenticated_user, registration_data: dict | None
) -> InvitationAcceptanceResult:
    token_digest = token_hash(token)
    invitation_reference = (
        OrganizationInvitation.objects.filter(
            token_hash=token_digest,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .values("organization_id")
        .first()
    )
    if invitation_reference is None:
        raise InvitationAcceptanceError("Not found.", status_code=404)

    organization = Organization.objects.select_for_update().get(
        id=invitation_reference["organization_id"]
    )
    invitation = (
        OrganizationInvitation.objects.select_for_update()
        .select_related("organization")
        .filter(
            token_hash=token_digest,
            organization=organization,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .first()
    )
    if invitation is None:
        raise InvitationAcceptanceError("Not found.", status_code=404)

    provisioning = OrganizationProvisioning.objects.select_for_update().filter(
        organization=organization
    ).first()
    if invitation.role == OrganizationMembership.Role.OWNER:
        if (
            provisioning is None
            or provisioning.owner_email.casefold() != invitation.email.casefold()
        ):
            raise InvitationAcceptanceError(
                "This owner invitation is no longer valid.", status_code=404
            )
    elif provisioning is not None:
        raise InvitationAcceptanceError(
            "The workspace is awaiting its owner.", status_code=409
        )

    user, tokens = _invited_user(
        invitation=invitation,
        authenticated_user=authenticated_user,
        registration_data=registration_data or {},
    )
    if provisioning is not None:
        OrganizationMembership.objects.filter(
            organization=organization,
            user=provisioning.creator,
            role=OrganizationMembership.Role.OWNER,
        ).delete()
        membership, created = OrganizationMembership.objects.get_or_create(
            organization=organization,
            user=user,
            defaults={"role": OrganizationMembership.Role.OWNER},
        )
        if not created and membership.role != OrganizationMembership.Role.OWNER:
            membership.role = OrganizationMembership.Role.OWNER
            membership.save(update_fields=("role", "updated_at"))
        provisioning.delete()
        action = WorkspaceAccessEvent.Action.ACCEPT_OWNER_INVITATION
        details = {}
    else:
        membership, created = OrganizationMembership.objects.get_or_create(
            organization=organization,
            user=user,
            defaults={"role": invitation.role},
        )
        action = WorkspaceAccessEvent.Action.ACCEPT_MEMBER_INVITATION
        details = {"email": invitation.email, "role": membership.role}

    WorkspaceAccessEvent.objects.create(
        action=action,
        actor=user,
        target_user=user,
        organization_id=organization.id,
        details=details,
    )
    invitation.accepted_at = timezone.now()
    invitation.save(update_fields=("accepted_at",))
    return InvitationAcceptanceResult(
        organization_id=organization.id,
        role=membership.role,
        membership_created=created,
        tokens=tokens,
    )


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

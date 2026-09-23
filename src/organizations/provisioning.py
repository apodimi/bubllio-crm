import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .email_service import send_invitation_email
from .models import (
    EmailAccount,
    InstallationState,
    OrganizationInvitation,
    OrganizationMembership,
    OrganizationProvisioning,
    OrganizationSettings,
    WorkspaceAccessEvent,
)


def installation_email_account():
    fallback_id = InstallationState.objects.values_list(
        "fallback_email_account_id", flat=True
    ).first()
    if fallback_id is None:
        return None
    return EmailAccount.objects.filter(pk=fallback_id, is_active=True).first()


def send_owner_invitation(*, organization, owner_email, creator, request):
    """Must run inside an atomic transaction so failed delivery leaves no invite."""
    account = installation_email_account()
    if account is None:
        raise ValueError(
            "Configure installation fallback SMTP before creating a workspace for another owner."
        )
    token = secrets.token_urlsafe(32)
    base_url = getattr(settings, "BUBLLIO_APP_URL", "").rstrip("/")
    if not base_url:
        base_url = request.build_absolute_uri("/").rstrip("/")
    invitation = OrganizationInvitation.objects.create(
        organization=organization,
        email=owner_email,
        role=OrganizationMembership.Role.OWNER,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        invited_by=creator,
        expires_at=timezone.now() + timedelta(days=7),
    )
    send_invitation_email(
        account=account,
        recipient=owner_email,
        organization_name=organization.name,
        invite_url=f"{base_url}/invite/{token}",
        initial_owner=True,
    )
    return invitation


@transaction.atomic
def create_workspace(*, serializer, creator, owner_email, request):
    organization = serializer.save()
    OrganizationSettings.objects.create(organization=organization)
    OrganizationMembership.objects.create(
        organization=organization, user=creator, role=OrganizationMembership.Role.OWNER
    )
    owner_is_creator = owner_email.casefold() == creator.email.casefold()
    if not owner_is_creator:
        OrganizationProvisioning.objects.create(
            organization=organization, creator=creator, owner_email=owner_email
        )
        send_owner_invitation(
            organization=organization,
            owner_email=owner_email,
            creator=creator,
            request=request,
        )
    WorkspaceAccessEvent.objects.create(
        action=WorkspaceAccessEvent.Action.CREATE_WORKSPACE,
        actor=creator,
        target_user=creator if owner_is_creator else None,
        organization_id=organization.id,
    )
    return organization

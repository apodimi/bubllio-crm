from django.db import transaction

from access.services.invitations import deliver_workspace_invitation
from delivery.models import OutboxMessage
from ..models import (
    EmailAccount,
    InstallationState,
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
    """Queue an owner invitation inside the workspace-creation transaction."""
    account = installation_email_account()
    if account is None:
        raise ValueError(
            "Configure installation fallback SMTP before creating a workspace for another owner."
        )
    return deliver_workspace_invitation(
        organization=organization,
        email=owner_email,
        role=OrganizationMembership.Role.OWNER,
        actor=creator,
        actor_role=OrganizationMembership.Role.OWNER,
        account=account,
        audit_action=WorkspaceAccessEvent.Action.INVITE_MEMBER,
        outbox_kind=OutboxMessage.Kind.OWNER_INVITATION,
    )


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

from django.utils import timezone

from organizations.models import Organization


def build_installation_data_export():
    organizations = Organization.objects.prefetch_related(
        "memberships__user",
        "invitations",
        "email_accounts",
        "companies",
        "contacts",
        "automations__runs",
    ).select_related("settings")

    workspaces = []
    for organization in organizations.order_by("created_at"):
        organization_settings = getattr(organization, "settings", None)
        workspaces.append(
            {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "is_personal": organization.is_personal,
                "created_at": organization.created_at,
                "updated_at": organization.updated_at,
                "settings": (
                    {
                        "timezone": organization_settings.timezone,
                        "locale": organization_settings.locale,
                        "default_from_name": organization_settings.default_from_name,
                    }
                    if organization_settings
                    else None
                ),
                "members": [
                    {
                        "id": membership.id,
                        "username": membership.user.username,
                        "email": membership.user.email,
                        "role": membership.role,
                        "joined_at": membership.created_at,
                    }
                    for membership in organization.memberships.all()
                ],
                "pending_invitations": [
                    {
                        "id": invitation.id,
                        "email": invitation.email,
                        "role": invitation.role,
                        "expires_at": invitation.expires_at,
                        "accepted_at": invitation.accepted_at,
                        "created_at": invitation.created_at,
                    }
                    for invitation in organization.invitations.all()
                ],
                "email_connections": [
                    {
                        "id": account.id,
                        "name": account.name,
                        "provider": account.provider,
                        "host": account.host,
                        "port": account.port,
                        "username": account.username,
                        "from_email": account.from_email,
                        "from_name": account.from_name,
                        "use_tls": account.use_tls,
                        "use_ssl": account.use_ssl,
                        "is_default": account.is_default,
                        "is_active": account.is_active,
                        "last_tested_at": account.last_tested_at,
                    }
                    for account in organization.email_accounts.all()
                ],
                "companies": [
                    {
                        "id": company.id,
                        "name": company.name,
                        "email": company.email,
                        "phone_number": company.phone_number,
                        "website": company.website,
                        "lifecycle_stage": company.lifecycle_stage,
                        "created_at": company.created_at,
                        "updated_at": company.updated_at,
                    }
                    for company in organization.companies.all()
                ],
                "contacts": [
                    {
                        "id": contact.id,
                        "company_id": contact.company_id,
                        "first_name": contact.first_name,
                        "last_name": contact.last_name,
                        "email": contact.email,
                        "phone_number": contact.phone_number,
                        "department": contact.department,
                        "job_title": contact.job_title,
                        "created_at": contact.created_at,
                        "updated_at": contact.updated_at,
                    }
                    for contact in organization.contacts.all()
                ],
                "automations": [
                    {
                        "id": automation.id,
                        "name": automation.name,
                        "trigger": automation.trigger,
                        "action_type": automation.action_type,
                        "action_config": automation.action_config,
                        "is_active": automation.is_active,
                        "created_at": automation.created_at,
                        "updated_at": automation.updated_at,
                        "runs": [
                            {
                                "id": run.id,
                                "trigger": run.trigger,
                                "status": run.status,
                                "payload": run.payload,
                                "created_at": run.created_at,
                            }
                            for run in automation.runs.all()
                        ],
                    }
                    for automation in organization.automations.all()
                ],
            }
        )

    return {
        "format": "bubllio-data-export",
        "format_version": 1,
        "generated_at": timezone.now(),
        "workspaces": workspaces,
    }

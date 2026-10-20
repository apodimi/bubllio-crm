from django.utils import timezone

from organizations.models import Organization


def build_workspace_data_export(organization):
    organization_settings = getattr(organization, "settings", None)
    settings = None
    if organization_settings:
        settings = {
            field.name: getattr(organization_settings, field.name)
            for field in organization_settings._meta.fields
            if field.name not in {"id", "organization"}
        }
    return {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "is_personal": organization.is_personal,
                "created_at": organization.created_at,
                "updated_at": organization.updated_at,
                "settings": settings,
                "members": [
                    {"id": m.id, "username": m.user.username, "email": m.user.email,
                     "role": m.role, "joined_at": m.created_at}
                    for m in organization.memberships.all()
                ],
                "pending_invitations": [
                    {"id": i.id, "email": i.email, "role": i.role, "expires_at": i.expires_at,
                     "accepted_at": i.accepted_at, "created_at": i.created_at}
                    for i in organization.invitations.all()
                ],
                "email_connections": [
                    {"id": a.id, "name": a.name, "provider": a.provider, "host": a.host,
                     "port": a.port, "username": a.username, "from_email": a.from_email,
                     "from_name": a.from_name, "use_tls": a.use_tls, "use_ssl": a.use_ssl,
                     "is_default": a.is_default, "is_active": a.is_active,
                     "last_tested_at": a.last_tested_at}
                    for a in organization.email_accounts.all()
                ],
                "companies": [
                    {"id": c.id, "name": c.name, "email": c.email, "phone_number": c.phone_number,
                     "website": c.website, "lifecycle_stage": c.lifecycle_stage,
                     "created_at": c.created_at, "updated_at": c.updated_at}
                    for c in organization.companies.all()
                ],
                "contacts": [
                    {"id": c.id, "company_id": c.company_id, "first_name": c.first_name,
                     "last_name": c.last_name, "email": c.email, "phone_number": c.phone_number,
                     "department": c.department, "job_title": c.job_title,
                     "created_at": c.created_at, "updated_at": c.updated_at}
                    for c in organization.contacts.all()
                ],
                "tasks": [
                    {
                        "id": task.id,
                        "company_id": task.company_id,
                        "contact_id": task.contact_id,
                        "deal_id": task.deal_id,
                        "assigned_to_id": task.assigned_to_id,
                        "created_by_id": task.created_by_id,
                        "completed_by_id": task.completed_by_id,
                        "title": task.title,
                        "kind": task.kind,
                        "priority": task.priority,
                        "workflow_status": task.workflow_status,
                        "due_at": task.due_at,
                        "reminder_at": task.reminder_at,
                        "notes": task.notes,
                        "completed_at": task.completed_at,
                        "created_at": task.created_at,
                        "updated_at": task.updated_at,
                    }
                    for task in organization.tasks.all()
                ],
                "external_collaborators": [
                    {
                        "id": collaborator.id,
                        "name": collaborator.name,
                        "specialty": collaborator.specialty,
                        "email": collaborator.email,
                        "phone_number": collaborator.phone_number,
                        "notes": collaborator.notes,
                        "is_active": collaborator.is_active,
                        "created_at": collaborator.created_at,
                        "updated_at": collaborator.updated_at,
                    }
                    for collaborator in organization.external_collaborators.all()
                ],
                "collaborator_services": [
                    {
                        "id": service.id,
                        "collaborator_id": service.collaborator_id,
                        "name": service.name,
                        "description": service.description,
                        "default_cost": service.default_cost,
                        "currency": service.currency,
                        "is_active": service.is_active,
                        "created_at": service.created_at,
                        "updated_at": service.updated_at,
                    }
                    for service in organization.collaborator_services.all()
                ],
                "deal_cost_lines": [
                    {
                        "id": line.id,
                        "deal_id": line.deal_id,
                        "collaborator_id": line.collaborator_id,
                        "collaborator_service_id": line.collaborator_service_id,
                        "collaborator_name": line.collaborator_name,
                        "service_name": line.service_name,
                        "description": line.description,
                        "quantity": line.quantity,
                        "unit_cost": line.unit_cost,
                        "currency": line.currency,
                        "status": line.status,
                        "created_at": line.created_at,
                        "updated_at": line.updated_at,
                    }
                    for line in organization.deal_cost_lines.all()
                ],
            }


def build_installation_data_export():
    organizations = Organization.objects.prefetch_related(
        "memberships__user",
        "invitations",
        "email_accounts",
        "companies",
        "contacts",
        "tasks",
        "external_collaborators",
        "collaborator_services",
        "deal_cost_lines",
    ).select_related("settings")

    workspaces = [
        build_workspace_data_export(organization)
        for organization in organizations.order_by("created_at")
    ]

    return {
        "format": "bubllio-data-export",
        "format_version": 1,
        "generated_at": timezone.now(),
        "workspaces": workspaces,
    }

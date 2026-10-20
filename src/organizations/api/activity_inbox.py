from datetime import timedelta

from django.db.models import Count, Exists, Min, OuterRef
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import (
    ROLE_CAPABILITIES,
    Capability,
    get_membership,
    get_organization_for_user,
)
from activities.models import Task
from companies.models import Company
from deals.models import Deal
from organizations.models import OrganizationInvitation
from organizations.serializers import ActivityInboxSerializer
from subscriptions.services import subscription_overview


MAX_ITEMS = 50


def _item(*, item_id, kind, severity, title, description, entity_type, entity_id, due_at, path):
    return {
        "id": item_id,
        "kind": kind,
        "severity": severity,
        "title": title,
        "description": description,
        "entity": {"type": entity_type, "id": str(entity_id) if entity_id else None},
        "due_at": due_at.isoformat() if due_at else None,
        "action": {"kind": "navigate", "path": path},
    }


def activity_inbox(*, organization, user, can_manage_members):
    now = timezone.now()
    today = timezone.localdate()
    items = []
    tasks = Task.objects.filter(
        organization=organization,
        assigned_to=user,
        completed_at__isnull=True,
        due_at__date__lte=today,
    ).select_related("company").order_by("due_at", "id")
    for task in tasks[:MAX_ITEMS]:
        overdue = task.due_at < now
        items.append(
            _item(
                item_id=f"task:{task.id}",
                kind="overdue_task" if overdue else "task_due_today",
                severity="critical" if overdue else "warning",
                title=task.title,
                description=task.company.name,
                entity_type="task",
                entity_id=task.id,
                due_at=task.due_at,
                path="tasks",
            )
        )

    open_task_for_deal = Task.objects.filter(
        organization=organization, deal_id=OuterRef("pk"), completed_at__isnull=True
    )
    deals = (
        Deal.objects.filter(
            organization=organization, assigned_to=user, archived_at__isnull=True
        )
        .exclude(stage__in=(Deal.Stage.WON, Deal.Stage.LOST))
        .annotate(has_next_action=Exists(open_task_for_deal))
        .filter(has_next_action=False)
        .select_related("company")
        .order_by("expected_close_date", "id")
    )
    deal_company_ids = set()
    for deal in deals[:MAX_ITEMS]:
        deal_company_ids.add(deal.company_id)
        items.append(
            _item(
                item_id=f"deal:{deal.id}:next-action",
                kind="deal_without_next_action",
                severity="warning",
                title=deal.title,
                description=deal.company.name,
                entity_type="deal",
                entity_id=deal.id,
                due_at=deal.expected_close_date,
                path="deals",
            )
        )

    open_task_for_company = Task.objects.filter(
        organization=organization, company_id=OuterRef("pk"), completed_at__isnull=True
    )
    companies = (
        Company.objects.filter(
            organization=organization, assigned_to=user, archived_at__isnull=True
        )
        .exclude(lifecycle_stage=Company.LifecycleStage.INACTIVE)
        .exclude(id__in=deal_company_ids)
        .annotate(has_open_task=Exists(open_task_for_company))
        .filter(has_open_task=False)
        .order_by("name", "id")
    )
    for company in companies[:MAX_ITEMS]:
        items.append(
            _item(
                item_id=f"company:{company.id}:follow-up",
                kind="company_without_follow_up",
                severity="info",
                title=company.name,
                description="No open follow-up",
                entity_type="company",
                entity_id=company.id,
                due_at=None,
                path=f"companies/{company.id}",
            )
        )

    overview = subscription_overview(organization)
    if overview["overdue_charges"]:
        items.append(_item(
            item_id="billing:overdue", kind="overdue_charges", severity="critical",
            title="Overdue charges", description=str(overview["overdue_charges"]),
            entity_type="billing", entity_id=None, due_at=None, path="services/billing",
        ))
    if overview["renewals_next_30_days"]:
        items.append(_item(
            item_id="billing:renewals", kind="renewals_due", severity="warning",
            title="Renewals in 30 days", description=str(overview["renewals_next_30_days"]),
            entity_type="billing", entity_id=None, due_at=today + timedelta(days=30),
            path="services/customer-services",
        ))

    if can_manage_members:
        pending = OrganizationInvitation.objects.filter(
            organization=organization,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
            expires_at__gt=now,
        ).aggregate(count=Count("id"), earliest_expiry=Min("expires_at"))
        if pending["count"]:
            items.append(_item(
                item_id="members:pending-invitations", kind="pending_invitations", severity="info",
                title="Pending invitations", description=str(pending["count"]), entity_type="members",
                entity_id=None, due_at=pending["earliest_expiry"], path="members",
            ))

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    items.sort(key=lambda item: (
        severity_order[item["severity"]], item["due_at"] is None, item["due_at"] or "", item["id"]
    ))
    return {"count": len(items[:MAX_ITEMS]), "items": items[:MAX_ITEMS]}


class ActivityInboxAPIView(APIView):
    serializer_class = ActivityInboxSerializer

    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM
        )
        membership = get_membership(user=request.user, organization=organization)
        can_manage_members = Capability.MANAGE_MEMBERS in ROLE_CAPABILITIES[membership.role]
        return Response(activity_inbox(
            organization=organization, user=request.user, can_manage_members=can_manage_members
        ))

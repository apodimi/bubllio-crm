from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from organizations.models import OrganizationMembership

from .models import Company, CompanyActivity, CompanyTimelineEvent


def _lock_assignee_membership(*, organization, assigned_to):
    if not assigned_to:
        return
    if not OrganizationMembership.objects.select_for_update().filter(
        organization=organization,
        user=assigned_to,
    ).exists():
        raise serializers.ValidationError(
            {"assigned_to": "Choose a member of this workspace."}
        )


COMPANY_ACTIVITY_TIMELINE_TYPES = {
    CompanyActivity.Action.CREATED: (
        CompanyTimelineEvent.Category.COMPANY,
        CompanyTimelineEvent.EventType.COMPANY_CREATED,
    ),
    CompanyActivity.Action.UPDATED: (
        CompanyTimelineEvent.Category.COMPANY,
        CompanyTimelineEvent.EventType.COMPANY_UPDATED,
    ),
    CompanyActivity.Action.ASSIGNED: (
        CompanyTimelineEvent.Category.COMPANY,
        CompanyTimelineEvent.EventType.COMPANY_ASSIGNED,
    ),
    CompanyActivity.Action.CONTACT_ADDED: (
        CompanyTimelineEvent.Category.CONTACT,
        CompanyTimelineEvent.EventType.CONTACT_CREATED,
    ),
    CompanyActivity.Action.ARCHIVED: (
        CompanyTimelineEvent.Category.COMPANY,
        CompanyTimelineEvent.EventType.COMPANY_ARCHIVED,
    ),
    CompanyActivity.Action.RESTORED: (
        CompanyTimelineEvent.Category.COMPANY,
        CompanyTimelineEvent.EventType.COMPANY_RESTORED,
    ),
}


def record_company_timeline_event(
    *,
    company,
    actor,
    category,
    event_type,
    source_type="",
    source_id=None,
    body="",
    details=None,
    occurred_at=None,
):
    return CompanyTimelineEvent.objects.create(
        organization=company.organization,
        company=company,
        actor=actor,
        category=category,
        event_type=event_type,
        source_type=source_type,
        source_id=source_id,
        body=body,
        details=details or {},
        **({"occurred_at": occurred_at} if occurred_at else {}),
    )


@transaction.atomic
def record_company_activity(*, company, actor, action, details=None):
    event_details = details or {}
    activity = CompanyActivity.objects.create(
        organization=company.organization,
        company=company,
        actor=actor,
        action=action,
        details=event_details,
    )
    category, event_type = COMPANY_ACTIVITY_TIMELINE_TYPES[action]
    record_company_timeline_event(
        company=company,
        actor=actor,
        category=category,
        event_type=event_type,
        source_type="contact" if action == CompanyActivity.Action.CONTACT_ADDED else "company",
        source_id=(
            event_details.get("contact_id")
            if action == CompanyActivity.Action.CONTACT_ADDED
            else company.id
        ),
        details=event_details,
        occurred_at=activity.created_at,
    )
    return activity


@transaction.atomic
def create_company(*, serializer, organization, actor):
    _lock_assignee_membership(
        organization=organization,
        assigned_to=serializer.validated_data.get("assigned_to"),
    )
    company = serializer.save(organization=organization)
    record_company_activity(
        company=company,
        actor=actor,
        action=CompanyActivity.Action.CREATED,
    )
    return company


@transaction.atomic
def update_company(*, company, serializer, actor):
    if "assigned_to" in serializer.validated_data:
        _lock_assignee_membership(
            organization=company.organization,
            assigned_to=serializer.validated_data["assigned_to"],
        )
    locked_company = Company.objects.select_for_update().get(pk=company.pk)
    serializer.instance = locked_company
    changed_fields = list(serializer.validated_data)
    assignment_changed = "assigned_to" in changed_fields and (
        serializer.validated_data["assigned_to"] != locked_company.assigned_to
    )
    updated_company = serializer.save()
    record_company_activity(
        company=updated_company,
        actor=actor,
        action=(
            CompanyActivity.Action.ASSIGNED
            if assignment_changed
            else CompanyActivity.Action.UPDATED
        ),
        details={"fields": changed_fields},
    )
    return updated_company


@transaction.atomic
def archive_company(*, company, actor):
    locked_company = Company.objects.select_for_update().get(pk=company.pk)
    if locked_company.archived_at:
        return locked_company
    locked_company.archived_at = timezone.now()
    locked_company.save(update_fields=("archived_at", "updated_at"))
    record_company_activity(
        company=locked_company,
        actor=actor,
        action=CompanyActivity.Action.ARCHIVED,
    )
    return locked_company


@transaction.atomic
def restore_company(*, company, actor):
    locked_company = Company.objects.select_for_update().get(pk=company.pk)
    if not locked_company.archived_at:
        return locked_company
    locked_company.archived_at = None
    locked_company.save(update_fields=("archived_at", "updated_at"))
    record_company_activity(
        company=locked_company,
        actor=actor,
        action=CompanyActivity.Action.RESTORED,
    )
    return locked_company


@transaction.atomic
def unassign_companies_for_removed_member(*, organization, user, actor):
    companies = Company.objects.select_for_update().filter(
        organization=organization,
        assigned_to=user,
    ).order_by("id")
    updated = 0
    for company in companies:
        company.assigned_to = None
        company.save(update_fields=("assigned_to", "updated_at"))
        record_company_activity(
            company=company,
            actor=actor,
            action=CompanyActivity.Action.ASSIGNED,
            details={"fields": ["assigned_to"], "reason": "membership_removed"},
        )
        updated += 1
    return updated

from django.db import transaction

from .models import Company, CompanyActivity, CompanyTimelineEvent


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
    company = serializer.save(organization=organization)
    record_company_activity(
        company=company,
        actor=actor,
        action=CompanyActivity.Action.CREATED,
    )
    return company

from django.db import transaction
from django.utils import timezone

from companies.models import CompanyTimelineEvent
from companies.services import record_company_timeline_event

from .models import Deal


@transaction.atomic
def move_deal(*, deal, stage, position, actor=None):
    previous_stage = deal.stage
    list(Deal.objects.select_for_update().filter(organization=deal.organization, archived_at__isnull=True).values_list("id", flat=True))
    destination = list(
        Deal.objects.filter(
            organization=deal.organization,
            archived_at__isnull=True,
            stage=stage,
        )
        .exclude(id=deal.id)
        .order_by("sort_order", "created_at")
    )
    destination.insert(min(position, len(destination)), deal)
    changed = []
    moved_at = timezone.now()
    for index, item in enumerate(destination):
        if item.stage != stage or item.sort_order != index:
            item.stage = stage
            item.sort_order = index
            item.updated_at = moved_at
            changed.append(item)
    if changed:
        Deal.objects.bulk_update(changed, ("stage", "sort_order", "updated_at"))
    deal.refresh_from_db()
    if previous_stage != deal.stage:
        record_company_timeline_event(
            company=deal.company,
            actor=actor,
            category=CompanyTimelineEvent.Category.DEAL,
            event_type=CompanyTimelineEvent.EventType.DEAL_STAGE_CHANGED,
            source_type="deal",
            source_id=deal.id,
            details={
                "deal_title": deal.title,
                "from_stage": previous_stage,
                "to_stage": deal.stage,
            },
        )
    return deal

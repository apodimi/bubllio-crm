from django.db import transaction
from django.utils import timezone

from .models import Deal


@transaction.atomic
def move_deal(*, deal, stage, position):
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
    return deal

from django.db import transaction
from django.utils import timezone

from .models import Task


@transaction.atomic
def complete_task(*, task: Task, user) -> Task:
    locked = Task.objects.select_for_update().get(id=task.id)
    if locked.completed_at is None:
        locked.completed_at = timezone.now()
        locked.completed_by = user
        locked.save(update_fields=("completed_at", "completed_by", "updated_at"))
    return locked


@transaction.atomic
def reopen_task(*, task: Task) -> Task:
    locked = Task.objects.select_for_update().get(id=task.id)
    if locked.completed_at is not None:
        locked.completed_at = None
        locked.completed_by = None
        locked.save(update_fields=("completed_at", "completed_by", "updated_at"))
    return locked


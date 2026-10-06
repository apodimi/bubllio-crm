from django.db import transaction
from django.utils import timezone

from .models import Task


@transaction.atomic
def move_task(*, task: Task, workflow_status: str, user) -> Task:
    locked = Task.objects.select_for_update().get(
        id=task.id, organization_id=task.organization_id
    )
    if workflow_status == Task.WorkflowStatus.COMPLETED:
        locked.workflow_status = workflow_status
        if locked.completed_at is None:
            locked.completed_at = timezone.now()
            locked.completed_by = user
    else:
        locked.workflow_status = workflow_status
        locked.completed_at = None
        locked.completed_by = None
    locked.save(
        update_fields=("workflow_status", "completed_at", "completed_by", "updated_at")
    )
    return locked


def complete_task(*, task: Task, user) -> Task:
    return move_task(
        task=task, workflow_status=Task.WorkflowStatus.COMPLETED, user=user
    )


def reopen_task(*, task: Task, user) -> Task:
    return move_task(task=task, workflow_status=Task.WorkflowStatus.TODO, user=user)

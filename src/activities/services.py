from django.db import transaction
from django.utils import timezone

from companies.models import CompanyTimelineEvent
from companies.services import record_company_timeline_event

from .models import Task


@transaction.atomic
def move_task(*, task: Task, workflow_status: str, user) -> Task:
    locked = Task.objects.select_for_update().get(
        id=task.id, organization_id=task.organization_id
    )
    previous_status = locked.workflow_status
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
    if previous_status != locked.workflow_status:
        if locked.workflow_status == Task.WorkflowStatus.COMPLETED:
            event_type = CompanyTimelineEvent.EventType.TASK_COMPLETED
        elif previous_status == Task.WorkflowStatus.COMPLETED:
            event_type = CompanyTimelineEvent.EventType.TASK_REOPENED
        else:
            event_type = CompanyTimelineEvent.EventType.TASK_STATUS_CHANGED
        record_company_timeline_event(
            company=locked.company,
            actor=user,
            category=CompanyTimelineEvent.Category.TASK,
            event_type=event_type,
            source_type="task",
            source_id=locked.id,
            details={
                "task_title": locked.title,
                "from_status": previous_status,
                "to_status": locked.workflow_status,
            },
        )
    return locked


def complete_task(*, task: Task, user) -> Task:
    return move_task(
        task=task, workflow_status=Task.WorkflowStatus.COMPLETED, user=user
    )


def reopen_task(*, task: Task, user) -> Task:
    return move_task(task=task, workflow_status=Task.WorkflowStatus.TODO, user=user)

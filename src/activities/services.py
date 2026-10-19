from django.db import transaction
from django.utils import timezone

from companies.models import CompanyTimelineEvent
from companies.services import record_company_timeline_event

from .models import Task


def _apply_workflow_status(*, task: Task, workflow_status: str, user) -> str:
    previous_status = task.workflow_status
    if workflow_status == Task.WorkflowStatus.COMPLETED:
        task.workflow_status = workflow_status
        if task.completed_at is None:
            task.completed_at = timezone.now()
            task.completed_by = user
    else:
        task.workflow_status = workflow_status
        task.completed_at = None
        task.completed_by = None
    task.save(
        update_fields=("workflow_status", "completed_at", "completed_by", "updated_at")
    )
    return previous_status


def _record_workflow_change(*, task: Task, previous_status: str, user) -> None:
    if previous_status == task.workflow_status:
        return
    if task.workflow_status == Task.WorkflowStatus.COMPLETED:
        event_type = CompanyTimelineEvent.EventType.TASK_COMPLETED
    elif previous_status == Task.WorkflowStatus.COMPLETED:
        event_type = CompanyTimelineEvent.EventType.TASK_REOPENED
    else:
        event_type = CompanyTimelineEvent.EventType.TASK_STATUS_CHANGED
    record_company_timeline_event(
        company=task.company,
        actor=user,
        category=CompanyTimelineEvent.Category.TASK,
        event_type=event_type,
        source_type="task",
        source_id=task.id,
        details={
            "task_title": task.title,
            "from_status": previous_status,
            "to_status": task.workflow_status,
        },
    )


@transaction.atomic
def update_task(*, task: Task, validated_data: dict, organization, user) -> Task:
    locked = Task.objects.select_for_update().select_related("company").get(
        id=task.id, organization_id=organization.id
    )
    values = dict(validated_data)
    workflow_status = values.pop("workflow_status", None)
    changed_fields = list(values)
    if workflow_status is not None:
        changed_fields.append("workflow_status")
    if values:
        for field, value in values.items():
            setattr(locked, field, value)
        locked.save(update_fields=(*values.keys(), "updated_at"))

    previous_status = locked.workflow_status
    if workflow_status is not None:
        previous_status = _apply_workflow_status(
            task=locked, workflow_status=workflow_status, user=user
        )

    record_company_timeline_event(
        company=locked.company,
        actor=user,
        category=CompanyTimelineEvent.Category.TASK,
        event_type=CompanyTimelineEvent.EventType.TASK_UPDATED,
        source_type="task",
        source_id=locked.id,
        details={"task_title": locked.title, "fields": changed_fields},
    )
    _record_workflow_change(task=locked, previous_status=previous_status, user=user)
    return locked


@transaction.atomic
def move_task(*, task: Task, workflow_status: str, user) -> Task:
    locked = Task.objects.select_for_update().get(
        id=task.id, organization_id=task.organization_id
    )
    previous_status = _apply_workflow_status(
        task=locked, workflow_status=workflow_status, user=user
    )
    _record_workflow_change(task=locked, previous_status=previous_status, user=user)
    return locked


def complete_task(*, task: Task, user) -> Task:
    return move_task(
        task=task, workflow_status=Task.WorkflowStatus.COMPLETED, user=user
    )


def reopen_task(*, task: Task, user) -> Task:
    return move_task(task=task, workflow_status=Task.WorkflowStatus.TODO, user=user)

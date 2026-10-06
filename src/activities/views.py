from datetime import datetime, time, timedelta
from uuid import UUID

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user

from .models import Task
from .serializers import TaskSerializer
from .services import complete_task, move_task, reopen_task


def _task_queryset(organization):
    return Task.objects.filter(organization=organization).select_related(
        "company", "contact", "deal", "assigned_to", "created_by", "completed_by"
    )


def _day_bounds(day):
    current_timezone = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(day, time.min), current_timezone)
    return start, start + timedelta(days=1)


class TaskListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        tasks = _task_queryset(organization)
        bucket = request.query_params.get("bucket", "open")
        today = timezone.localdate()
        _, end = _day_bounds(today)
        if bucket == "today":
            tasks = tasks.filter(
                completed_at__isnull=True, due_at__gte=timezone.now(), due_at__lt=end
            )
        elif bucket == "upcoming":
            tasks = tasks.filter(completed_at__isnull=True, due_at__gte=end)
        elif bucket == "overdue":
            tasks = tasks.filter(completed_at__isnull=True, due_at__lt=timezone.now())
        elif bucket == "open":
            tasks = tasks.filter(completed_at__isnull=True)
        elif bucket == "completed":
            tasks = tasks.filter(completed_at__isnull=False)
        elif bucket != "all":
            return Response(
                {"bucket": ["Choose today, upcoming, overdue, open, completed, or all."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assigned_to = request.query_params.get("assigned_to")
        if assigned_to == "me":
            tasks = tasks.filter(assigned_to=request.user)
        elif assigned_to == "unassigned":
            tasks = tasks.filter(assigned_to__isnull=True)
        elif assigned_to:
            try:
                tasks = tasks.filter(assigned_to_id=int(assigned_to))
            except ValueError:
                return Response(
                    {"assigned_to": ["Choose a workspace member, me, or unassigned."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        for field in ("company", "contact", "deal"):
            value = request.query_params.get(field)
            if value:
                try:
                    parsed_value = UUID(value)
                except ValueError:
                    return Response(
                        {field: ["Enter a valid identifier."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                tasks = tasks.filter(**{f"{field}_id": parsed_value})
        kind = request.query_params.get("kind")
        if kind:
            if kind not in Task.Kind.values:
                return Response(
                    {"kind": ["Select a valid task type."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            tasks = tasks.filter(kind=kind)
        return Response(TaskSerializer(tasks, many=True).data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        serializer = TaskSerializer(
            data=request.data, context={"organization": organization}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TaskDetailAPIView(APIView):
    def _task(self, request, organization_id, task_id, capability):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=capability,
        )
        return organization, get_object_or_404(
            _task_queryset(organization), id=task_id
        )

    def get(self, request, organization_id, task_id):
        _, task = self._task(
            request, organization_id, task_id, Capability.VIEW_CRM
        )
        return Response(TaskSerializer(task).data)

    def patch(self, request, organization_id, task_id):
        organization, task = self._task(
            request, organization_id, task_id, Capability.MANAGE_CRM
        )
        serializer = TaskSerializer(
            task,
            data=request.data,
            partial=True,
            context={"organization": organization},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, organization_id, task_id):
        _, task = self._task(
            request, organization_id, task_id, Capability.MANAGE_CRM
        )
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskCompletionAPIView(APIView):
    def post(self, request, organization_id, task_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        task = get_object_or_404(_task_queryset(organization), id=task_id)
        return Response(TaskSerializer(complete_task(task=task, user=request.user)).data)


class TaskReopenAPIView(APIView):
    def post(self, request, organization_id, task_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        task = get_object_or_404(_task_queryset(organization), id=task_id)
        return Response(TaskSerializer(reopen_task(task=task, user=request.user)).data)


class TaskMoveAPIView(APIView):
    def post(self, request, organization_id, task_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        task = get_object_or_404(_task_queryset(organization), id=task_id)
        workflow_status = request.data.get("workflow_status")
        if workflow_status not in Task.WorkflowStatus.values:
            return Response(
                {"workflow_status": ["Select a valid workflow status."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            TaskSerializer(
                move_task(
                    task=task, workflow_status=workflow_status, user=request.user
                )
            ).data
        )

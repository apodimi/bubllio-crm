from django.urls import path

from .views import (
    TaskCompletionAPIView,
    TaskDetailAPIView,
    TaskListCreateAPIView,
    TaskMoveAPIView,
    TaskReopenAPIView,
)

urlpatterns = [
    path("", TaskListCreateAPIView.as_view(), name="task-list"),
    path("<uuid:task_id>/", TaskDetailAPIView.as_view(), name="task-detail"),
    path(
        "<uuid:task_id>/complete/",
        TaskCompletionAPIView.as_view(),
        name="task-complete",
    ),
    path(
        "<uuid:task_id>/reopen/", TaskReopenAPIView.as_view(), name="task-reopen"
    ),
    path("<uuid:task_id>/move/", TaskMoveAPIView.as_view(), name="task-move"),
]

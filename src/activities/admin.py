from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "organization",
        "company",
        "kind",
        "priority",
        "workflow_status",
        "assigned_to",
        "due_at",
        "completed_at",
    )
    list_filter = ("organization", "kind", "priority", "workflow_status")
    search_fields = ("title", "company__name", "contact__first_name", "contact__last_name")

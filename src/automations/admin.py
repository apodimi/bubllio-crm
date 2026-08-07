from django.contrib import admin

from .models import Automation, AutomationRun


@admin.register(Automation)
class AutomationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "organization",
        "trigger",
        "action_type",
        "is_active",
        "created_at",
        "updated_at",
    )
    search_fields = ("name", "trigger", "action_type")
    list_filter = ("organization", "trigger", "action_type", "is_active")


@admin.register(AutomationRun)
class AutomationRunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "automation",
        "trigger",
        "status",
        "created_at",
    )
    search_fields = ("automation__name", "trigger", "error_message")
    list_filter = ("trigger", "status", "created_at")
    readonly_fields = ("automation", "trigger", "status", "payload", "error_message", "created_at")

from django.contrib import admin

from .models import OutboxMessage


@admin.register(OutboxMessage)
class OutboxMessageAdmin(admin.ModelAdmin):
    list_display = ("kind", "status", "attempts", "available_at", "sent_at", "created_at")
    list_filter = ("kind", "status")
    readonly_fields = (
        "id",
        "kind",
        "payload",
        "encrypted_data",
        "attempts",
        "locked_at",
        "sent_at",
        "last_error",
        "created_at",
        "updated_at",
    )

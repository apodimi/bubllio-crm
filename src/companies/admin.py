from django.contrib import admin

from .models import Company, CompanyTimelineEvent


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "organization",
        "lifecycle_stage",
        "tax_id",
        "industry",
        "email",
        "phone_number",
        "website",
        "created_at",
        "updated_at",
    )
    search_fields = ("name", "tax_id", "industry", "email", "phone_number", "website", "city")
    list_filter = ("organization", "lifecycle_stage", "country")


@admin.register(CompanyTimelineEvent)
class CompanyTimelineEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "company", "organization", "actor", "occurred_at")
    list_filter = ("category", "event_type", "organization")
    search_fields = ("company__name", "actor__username", "body")
    readonly_fields = (
        "id",
        "organization",
        "company",
        "actor",
        "category",
        "event_type",
        "source_type",
        "source_id",
        "body",
        "details",
        "occurred_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

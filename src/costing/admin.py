from django.contrib import admin

from .models import CollaboratorService, DealCostLine, ExternalCollaborator


@admin.register(ExternalCollaborator)
class ExternalCollaboratorAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "specialty", "is_active", "updated_at")
    list_filter = ("is_active", "organization")
    search_fields = ("name", "specialty", "email")


@admin.register(CollaboratorService)
class CollaboratorServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "collaborator", "default_cost", "currency", "is_active")
    list_filter = ("is_active", "currency", "organization")
    search_fields = ("name", "collaborator__name")


@admin.register(DealCostLine)
class DealCostLineAdmin(admin.ModelAdmin):
    list_display = ("service_name", "deal", "collaborator_name", "unit_cost", "currency", "status")
    list_filter = ("status", "currency", "organization")
    search_fields = ("service_name", "collaborator_name", "deal__title")


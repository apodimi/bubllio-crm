from django.contrib import admin

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "organization",
        "lifecycle_stage",
        "email",
        "phone_number",
        "website",
        "created_at",
        "updated_at",
    )
    search_fields = ("name", "email", "phone_number", "website")
    list_filter = ("organization", "lifecycle_stage")

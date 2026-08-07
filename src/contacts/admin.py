from django.contrib import admin

from .models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "first_name",
        "last_name",
        "company",
        "organization",
        "department",
        "job_title",
        "email",
        "phone_number",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "department",
        "job_title",
    )
    list_filter = ("organization", "company", "department")

from django.contrib import admin

from .models import Organization, OrganizationMembership


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "created_at", "updated_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "user", "role", "created_at", "updated_at")
    search_fields = ("organization__name", "user__username", "user__email")
    list_filter = ("organization", "role")

from django.contrib import admin

from .models import Organization

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug', 'created_at', 'updated_at')
    search_fields = ("name", "slug")
    prepopulated_fields = {'slug': ('name',)}

from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "display_name", "timezone", "locale", "onboarding_completed_at")
    search_fields = ("user__username", "user__email", "display_name")

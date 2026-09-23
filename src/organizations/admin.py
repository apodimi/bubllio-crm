from django import forms
from django.contrib import admin
from django.db import transaction

from .email_security import encrypt_secret
from .choices import locale_choices, timezone_choices
from .models import EmailAccount, InstallationAdminInvitation, Organization, OrganizationInvitation, OrganizationMembership, OrganizationSettings


class OrganizationSettingsAdminForm(forms.ModelForm):
    timezone = forms.ChoiceField(choices=timezone_choices)
    locale = forms.ChoiceField(choices=locale_choices)

    class Meta:
        model = OrganizationSettings
        fields = "__all__"


class EmailAccountAdminForm(forms.ModelForm):
    password = forms.CharField(
        label="SMTP password",
        widget=forms.PasswordInput(render_value=False),
        required=False,
        strip=False,
        help_text="Required when creating an account. Leave blank to keep the existing password.",
    )

    class Meta:
        model = EmailAccount
        exclude = ("encrypted_password",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.instance.pk:
            self.fields["password"].required = True

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get("use_tls") and cleaned_data.get("use_ssl"):
            raise forms.ValidationError("use_tls and use_ssl cannot both be enabled.")
        return cleaned_data

    def save(self, commit=True):
        password = self.cleaned_data.get("password")
        instance = super().save(commit=False)
        if password:
            instance.encrypted_password = encrypt_secret(password)
        if commit:
            instance.save()
            self.save_m2m()
        return instance


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


@admin.register(OrganizationInvitation)
class OrganizationInvitationAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "email", "role", "expires_at", "accepted_at")
    search_fields = ("organization__name", "email")
    list_filter = ("organization", "role")
    fields = ("id", "organization", "email", "role", "invited_by", "expires_at", "accepted_at", "created_at")
    readonly_fields = fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(InstallationAdminInvitation)
class InstallationAdminInvitationAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "invited_by", "expires_at", "accepted_at")
    search_fields = ("email",)
    fields = ("id", "email", "invited_by", "expires_at", "accepted_at", "created_at")
    readonly_fields = fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    form = OrganizationSettingsAdminForm
    list_display = ("organization", "timezone", "locale", "default_from_name", "updated_at")
    search_fields = ("organization__name", "organization__slug")


@admin.register(EmailAccount)
class EmailAccountAdmin(admin.ModelAdmin):
    form = EmailAccountAdminForm
    list_display = (
        "id",
        "name",
        "organization",
        "provider",
        "from_email",
        "is_default",
        "is_active",
        "last_tested_at",
    )
    search_fields = ("name", "organization__name", "from_email", "host")
    list_filter = ("organization", "provider", "is_default", "is_active")
    readonly_fields = ("last_tested_at", "last_test_error", "created_at", "updated_at")

    @transaction.atomic
    def save_model(self, request, obj, form, change):
        if obj.is_default:
            EmailAccount.objects.filter(organization=obj.organization).exclude(
                id=obj.id
            ).update(is_default=False)
        super().save_model(request, obj, form, change)

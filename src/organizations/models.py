import uuid

from django.conf import settings
from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class InstallationState(models.Model):
    """A single database row serializes and permanently closes first-run setup."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    fallback_email_account = models.ForeignKey(
        "EmailAccount", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="installation_fallback_for",
    )

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)


class OrganizationSettings(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    timezone = models.CharField(max_length=64, default="UTC")
    locale = models.CharField(max_length=20, default="en-us")
    default_from_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.organization}"


class EmailAccount(models.Model):
    class Provider(models.TextChoices):
        SMTP = "smtp", "SMTP"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="email_accounts",
    )
    name = models.CharField(max_length=255)
    provider = models.CharField(
        max_length=30,
        choices=Provider.choices,
        default=Provider.SMTP,
    )
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255)
    encrypted_password = models.TextField()
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    from_email = models.EmailField()
    from_name = models.CharField(max_length=255, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "name"),
                name="unique_email_account_name_per_organization",
            ),
            models.UniqueConstraint(
                fields=("organization",),
                condition=models.Q(is_default=True),
                name="unique_default_email_account_per_organization",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.organization})"


class OrganizationMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"
        VIEWER = "viewer", "Viewer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "user"),
                name="unique_organization_membership",
            ),
            models.UniqueConstraint(
                fields=("organization",),
                condition=models.Q(role="owner"),
                name="unique_owner_per_organization",
            ),
        ]

    def __str__(self):
        return f"{self.user} - {self.organization} ({self.role})"


class OrganizationInvitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=OrganizationMembership.Role.choices)
    token_hash = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("organization", "email"))]
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "email"),
                condition=models.Q(accepted_at__isnull=True),
                name="unique_pending_invitation_per_email",
            ),
        ]

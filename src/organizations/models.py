import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    is_personal = models.BooleanField(default=False)
    personal_owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="personal_workspace",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class WorkspaceCreatorGrant(models.Model):
    """Installation-scoped provisioning right without Django staff privileges."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workspace_creator_grant"
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name="workspace_creator_grants_given",
    )
    created_at = models.DateTimeField(auto_now_add=True)


class OrganizationProvisioning(models.Model):
    """An isolated workspace awaiting acceptance by its nominated owner."""

    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name="provisioning"
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="workspaces_provisioned"
    )
    owner_email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)


class WorkspaceAccessEvent(models.Model):
    """Append-only installation activity history without secret values."""

    class Action(models.TextChoices):
        GRANT_CREATOR = "grant_creator", "Grant workspace creator"
        REVOKE_CREATOR = "revoke_creator", "Revoke workspace creator"
        CREATE_WORKSPACE = "create_workspace", "Create workspace"
        RESEND_OWNER_INVITATION = "resend_owner_invitation", "Resend owner invitation"
        CANCEL_WORKSPACE = "cancel_workspace", "Cancel pending workspace"
        ACCEPT_OWNER_INVITATION = "accept_owner_invitation", "Accept owner invitation"
        DOWNLOAD_DATA_EXPORT = "download_data_export", "Download installation data export"
        INVITE_MEMBER = "invite_member", "Invite workspace member"
        RESEND_MEMBER_INVITATION = "resend_member_invitation", "Resend member invitation"
        REVOKE_MEMBER_INVITATION = "revoke_member_invitation", "Revoke member invitation"
        ACCEPT_MEMBER_INVITATION = "accept_member_invitation", "Accept member invitation"
        CHANGE_MEMBER_ROLE = "change_member_role", "Change member role"
        REMOVE_MEMBER = "remove_member", "Remove workspace member"
        CREATE_EMAIL_CONNECTION = "create_email_connection", "Create email connection"
        UPDATE_EMAIL_CONNECTION = "update_email_connection", "Update email connection"
        DELETE_EMAIL_CONNECTION = "delete_email_connection", "Delete email connection"
        INVITE_INSTALLATION_ADMIN = "invite_installation_admin", "Invite installation administrator"
        ACCEPT_INSTALLATION_ADMIN = "accept_installation_admin", "Accept installation administrator invitation"
        UPDATE_INSTALLATION_SETTINGS = "update_installation_settings", "Update installation settings"
        UPDATE_WORKSPACE_SETTINGS = "update_workspace_settings", "Update workspace settings"
        DOWNLOAD_WORKSPACE_EXPORT = "download_workspace_export", "Download workspace data export"

    action = models.CharField(max_length=40, choices=Action.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="workspace_access_actions"
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="workspace_access_targets"
    )
    organization_id = models.UUIDField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class InstallationState(models.Model):
    """A single database row serializes and permanently closes first-run setup."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    allow_personal_workspaces = models.BooleanField(default=False)
    fallback_email_account = models.ForeignKey(
        "EmailAccount", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="installation_fallback_for",
    )

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)


class InstallationBackupEvent(models.Model):
    """Operator-reported backup and restore-test result; never stores backup data."""

    class Kind(models.TextChoices):
        BACKUP = "backup", "Backup"
        RESTORE_TEST = "restore_test", "Restore test"

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"

    kind = models.CharField(max_length=20, choices=Kind.choices)
    status = models.CharField(max_length=10, choices=Status.choices)
    completed_at = models.DateTimeField()

    class Meta:
        ordering = ("-completed_at", "-id")
        indexes = [models.Index(fields=("kind", "-completed_at"))]


class OrganizationSettings(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    timezone = models.CharField(max_length=64, default="UTC")
    locale = models.CharField(max_length=20, default="en-us")
    default_from_name = models.CharField(max_length=255, blank=True)
    legal_name = models.CharField(max_length=255, blank=True)
    trading_name = models.CharField(max_length=255, blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    tax_office = models.CharField(max_length=120, blank=True)
    registration_number = models.CharField(max_length=80, blank=True)
    business_email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=30, blank=True)
    country = models.CharField(max_length=2, blank=True)
    currency = models.CharField(max_length=3, default="EUR")
    fiscal_year_start_month = models.PositiveSmallIntegerField(default=1)
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    default_payment_terms_days = models.PositiveSmallIntegerField(default=30)
    document_prefix = models.CharField(max_length=20, blank=True)
    next_document_number = models.PositiveIntegerField(default=1)
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
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        EXPIRED = "expired", "Expired"
        REVOKED = "revoked", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=OrganizationMembership.Role.choices)
    token_hash = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("organization", "email"))]
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "email"),
                condition=models.Q(accepted_at__isnull=True, revoked_at__isnull=True),
                name="unique_pending_invitation_per_email",
            ),
        ]

    @property
    def status(self):
        if self.accepted_at is not None:
            return self.Status.ACCEPTED
        if self.revoked_at is not None:
            return self.Status.REVOKED
        if self.expires_at <= timezone.now():
            return self.Status.EXPIRED
        return self.Status.PENDING


class InstallationAdminInvitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    token_hash = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="installation_admin_invitations_sent",
    )
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("email",),
                condition=models.Q(accepted_at__isnull=True),
                name="unique_pending_installation_admin_invitation_per_email",
            ),
        ]

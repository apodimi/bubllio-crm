"""Create a passwordless CRM staging workspace for a Core-led transfer."""

from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_slug
from django.db import transaction
from django.utils import timezone

from access.models import SuiteUserLink
from organizations.models import InstallationState, Organization, OrganizationMembership, OrganizationSettings


class Command(BaseCommand):
    help = "Bootstrap an empty CRM with a Keycloak-linked, passwordless transfer user"

    def add_arguments(self, parser):
        parser.add_argument("--subject", required=True)
        parser.add_argument("--workspace-slug", required=True)
        parser.add_argument("--workspace-name", default="Migration staging")

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.CORE_REQUIRED:
            raise CommandError("This bootstrap requires CORE_REQUIRED=true.")
        if not settings.SUITE_OIDC_ISSUER:
            raise CommandError("Configure the suite issuer before bootstrapping.")
        state = InstallationState.objects.filter(pk=1).first()
        if get_user_model().objects.exists() or Organization.objects.exists() or (state and state.completed_at):
            raise CommandError("The target CRM database must be empty.")
        subject = options["subject"].strip()
        if not subject or len(subject) > 255:
            raise CommandError("A valid immutable Keycloak subject is required.")
        slug = options["workspace_slug"].strip()
        try:
            validate_slug(slug)
        except ValidationError as error:
            raise CommandError("Choose a valid staging workspace slug.") from error
        if not slug or len(slug) > 255:
            raise CommandError("Choose a valid staging workspace slug.")

        user = get_user_model()(username=f"suite-bootstrap-{uuid4().hex}", is_active=True)
        user.set_unusable_password()
        user.save()
        SuiteUserLink.objects.create(user=user, issuer=settings.SUITE_OIDC_ISSUER, subject=subject)
        organization = Organization.objects.create(name=options["workspace_name"], slug=slug)
        OrganizationMembership.objects.create(
            user=user, organization=organization, role=OrganizationMembership.Role.OWNER
        )
        OrganizationSettings.objects.create(organization=organization)
        state = state or InstallationState(pk=1)
        state.completed_at = timezone.now()
        state.allow_personal_workspaces = False
        state.save()
        self.stdout.write(self.style.SUCCESS(f"Core staging ready. Import with --trial-admin {user.username}"))

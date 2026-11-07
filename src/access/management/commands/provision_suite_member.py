"""Bind a Core member to a local CRM role without creating credentials."""

from uuid import UUID, uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from access.models import SuiteOrganizationLink, SuiteUserLink
from organizations.models import Organization, OrganizationMembership


class Command(BaseCommand):
    help = "Provision a Keycloak subject for a Core organization and CRM domain role"

    def add_arguments(self, parser):
        parser.add_argument("--subject", required=True)
        parser.add_argument("--crm-organization-id", type=UUID, required=True)
        parser.add_argument("--core-organization-id", type=UUID, required=True)
        parser.add_argument("--user-id", type=int)
        parser.add_argument("--role", choices=OrganizationMembership.Role.values, default="member")

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.CORE_REQUIRED:
            raise CommandError("This command requires CORE_REQUIRED=true.")
        subject = options["subject"].strip()
        if not subject or len(subject) > 255:
            raise CommandError("A valid immutable Keycloak subject is required.")
        organization = Organization.objects.filter(pk=options["crm_organization_id"], provisioning__isnull=True).first()
        if not organization:
            raise CommandError("CRM organization not found.")
        core_id = options["core_organization_id"]
        org_link = SuiteOrganizationLink.objects.filter(organization=organization).first()
        if org_link and org_link.core_organization_id != core_id:
            raise CommandError("CRM organization is linked to a different Core organization.")
        if SuiteOrganizationLink.objects.filter(core_organization_id=core_id).exclude(organization=organization).exists():
            raise CommandError("Core organization is linked to a different CRM organization.")

        existing_link = SuiteUserLink.objects.select_related("user").filter(
            issuer=settings.SUITE_OIDC_ISSUER, subject=subject
        ).first()
        if existing_link:
            user = existing_link.user
            if options["user_id"] and user.pk != options["user_id"]:
                raise CommandError("Suite identity is linked to another CRM user.")
        elif options["user_id"]:
            user = get_user_model().objects.filter(pk=options["user_id"]).first()
            if not user or SuiteUserLink.objects.filter(user=user).exists():
                raise CommandError("CRM user not found or already linked.")
            if user.is_superuser or user.is_staff or user.has_usable_password():
                raise CommandError("CRM user must be a passwordless, non-staff account.")
            user.is_active = True
            user.save(update_fields=["is_active"])
            SuiteUserLink.objects.create(user=user, issuer=settings.SUITE_OIDC_ISSUER, subject=subject)
        else:
            user = get_user_model()(username=f"suite-{uuid4().hex}", is_active=True)
            user.set_unusable_password()
            user.save()
            SuiteUserLink.objects.create(user=user, issuer=settings.SUITE_OIDC_ISSUER, subject=subject)

        if not user.is_active or user.has_usable_password() or user.is_staff or user.is_superuser:
            raise CommandError("The linked CRM user must be active and passwordless without staff privileges.")
        SuiteOrganizationLink.objects.get_or_create(
            organization=organization, defaults={"core_organization_id": core_id}
        )
        membership, created = OrganizationMembership.objects.get_or_create(
            organization=organization,
            user=user,
            defaults={"role": options["role"]},
        )
        if not created and membership.role != options["role"]:
            raise CommandError("Existing CRM role differs; change it through a separate reviewed operation.")
        self.stdout.write(self.style.SUCCESS(f"Suite member ready: CRM user {user.pk}"))

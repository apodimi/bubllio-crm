"""Bind reviewed immutable Core/Keycloak IDs to imported CRM records."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from uuid import UUID

from access.models import SuiteOrganizationLink, SuiteUserLink
from organizations.models import Organization, OrganizationMembership


class Command(BaseCommand):
    help = "Link an existing active CRM user and membership to suite identities"

    def add_arguments(self, parser):
        parser.add_argument("--user-id", type=int, required=True)
        parser.add_argument("--subject", required=True)
        parser.add_argument("--crm-organization-id", type=UUID, required=True)
        parser.add_argument("--core-organization-id", type=UUID, required=True)

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.SUITE_OIDC_ISSUER:
            raise CommandError("Set SUITE_OIDC_ISSUER before linking identities.")
        user = get_user_model().objects.filter(pk=options["user_id"], is_active=True).first()
        organization = Organization.objects.filter(pk=options["crm_organization_id"]).first()
        if not user or not organization:
            raise CommandError("Active user or CRM organization not found.")
        if not OrganizationMembership.objects.filter(user=user, organization=organization).exists():
            raise CommandError("The user has no CRM membership in this organization.")
        subject = options["subject"].strip()
        if not subject or len(subject) > 255:
            raise CommandError("A valid immutable Keycloak subject is required.")

        user_link = SuiteUserLink.objects.filter(user=user).first()
        if user_link and (user_link.issuer != settings.SUITE_OIDC_ISSUER or user_link.subject != subject):
            raise CommandError("This CRM user is linked to a different suite identity.")
        if SuiteUserLink.objects.filter(issuer=settings.SUITE_OIDC_ISSUER, subject=subject).exclude(user=user).exists():
            raise CommandError("This suite identity is linked to another CRM user.")

        org_link = SuiteOrganizationLink.objects.filter(organization=organization).first()
        core_id = options["core_organization_id"]
        if org_link and org_link.core_organization_id != core_id:
            raise CommandError("This CRM organization is linked to a different Core organization.")
        if SuiteOrganizationLink.objects.filter(core_organization_id=core_id).exclude(organization=organization).exists():
            raise CommandError("This Core organization is linked to another CRM organization.")

        SuiteUserLink.objects.get_or_create(
            user=user, defaults={"issuer": settings.SUITE_OIDC_ISSUER, "subject": subject}
        )
        SuiteOrganizationLink.objects.get_or_create(
            organization=organization, defaults={"core_organization_id": core_id}
        )
        self.stdout.write(self.style.SUCCESS("Suite identity links recorded."))

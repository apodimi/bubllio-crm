"""Restore a validated CRM business transfer into a fresh installation."""

import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.color import no_style
from django.db import connection, transaction

from organizations.models import InstallationState, Organization, OrganizationMembership, OrganizationSettings
from access.models import SuiteUserLink

from .business_transfer_fields import BUSINESS_FIELDS
from .business_transfer_schema import BUSINESS_DATASETS
from .business_import_validation import BusinessImportError, load_business_transfer, validate_business_transfer


def import_business_transfer(transfer, *, trial_admin):
    """Restore into a setup-complete installation with only its empty bootstrap workspace."""
    validate_business_transfer(transfer)
    user_model = get_user_model()
    with transaction.atomic():
        if settings.CORE_REQUIRED:
            if (
                not trial_admin.is_active
                or trial_admin.is_superuser
                or trial_admin.has_usable_password()
                or not SuiteUserLink.objects.filter(user=trial_admin).exists()
            ):
                raise BusinessImportError("The transfer user must be an active passwordless suite identity")
        elif not trial_admin.is_active or not trial_admin.is_superuser:
            raise BusinessImportError("The trial administrator must be an active installation admin")
        if not InstallationState.objects.filter(completed_at__isnull=False).exists():
            raise BusinessImportError("Complete the normal installation setup before importing")
        bootstrap = Organization._base_manager.select_for_update().first()
        if Organization._base_manager.count() != 1 or bootstrap.is_personal:
            raise BusinessImportError("The target must have only its setup workspace")
        if not OrganizationMembership.objects.filter(
            organization=bootstrap, user=trial_admin, role=OrganizationMembership.Role.OWNER
        ).exists():
            raise BusinessImportError("The trial administrator must own the setup workspace")
        for name, model in BUSINESS_DATASETS:
            if name == "organizations":
                continue
            if name == "memberships":
                expected = OrganizationMembership.objects.filter(organization=bootstrap, user=trial_admin)
            elif name == "organization_settings":
                expected = OrganizationSettings.objects.filter(organization=bootstrap)
            else:
                expected = model._base_manager.none()
            if model._base_manager.count() != expected.count():
                raise BusinessImportError(f"Target {name} is not empty")
        source_organizations = transfer["datasets"]["organizations"]
        if any(
            source["id"] == str(bootstrap.pk) or source["slug"] == bootstrap.slug
            for source in source_organizations
        ):
            raise BusinessImportError("The source workspace conflicts with the setup workspace")

        user_map = {}
        for source in transfer["users"]:
            user = user_model(
                username=f"transfer-{source['id']}-{uuid.uuid4().hex[:12]}",
                email=source["email"],
                is_active=False,
            )
            user.set_unusable_password()
            user.save()
            user_map[source["id"]] = user.pk

        for name, model in BUSINESS_DATASETS:
            fields = {field.attname: field for field in model._meta.concrete_fields}
            if set(fields) != set(BUSINESS_FIELDS[name]):
                raise BusinessImportError(f"Target model changed for {name}; update the importer")
            for source in transfer["datasets"][name]:
                values = source.copy()
                if model._meta.pk.get_internal_type() in {"AutoField", "BigAutoField"}:
                    values[model._meta.pk.attname] = None
                for field in fields.values():
                    if field.is_relation and field.related_model == user_model:
                        old_id = values[field.attname]
                        values[field.attname] = user_map.get(old_id) if old_id is not None else None
                instance = model(**values)
                try:
                    for field in fields.values():
                        if not field.is_relation and not (
                            field.primary_key and getattr(instance, field.attname) is None
                        ):
                            cleaned = field.clean(getattr(instance, field.attname), instance)
                            setattr(instance, field.attname, cleaned)
                except (TypeError, ValueError, ValidationError) as error:
                    raise BusinessImportError(f"{name} contains an invalid value") from error
                instance.save_base(raw=True, force_insert=True)

        for source in source_organizations:
            if not source["is_personal"]:
                OrganizationMembership.objects.create(
                    organization_id=source["id"],
                    user=trial_admin,
                    role=OrganizationMembership.Role.ADMIN,
                )

        statements = connection.ops.sequence_reset_sql(
            no_style(), [model for _, model in BUSINESS_DATASETS]
        )
        with connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
    return {name: len(rows) for name, rows in transfer["datasets"].items()}

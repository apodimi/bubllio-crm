"""Versioned CRM business snapshot for transfer into a fresh installation."""

import hashlib
import io
import json
import uuid
from datetime import date, datetime, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import F
from django.utils import timezone

from organizations.models import OrganizationProvisioning

from .business_transfer_fields import BUSINESS_FIELDS
from .business_transfer_schema import BUSINESS_DATASETS

FORMAT = "bubllio-crm-business-transfer"
FORMAT_VERSION = 1


def write_business_transfer(output):
    """Write a consistent snapshot to a binary file without retaining business rows."""
    was_in_transaction = connection.in_atomic_block
    with transaction.atomic():
        if connection.vendor == "postgresql" and not was_in_transaction:
            with connection.cursor() as cursor:
                cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")

        if OrganizationProvisioning.objects.exists():
            raise ValueError("Resolve pending workspace provisioning before preparing a transfer")

        _validate_schema_and_tenants()
        user_model = get_user_model()
        user_ids = set()
        manifest = {}
        _write(output, '{"format":' + _json(FORMAT))
        _write(output, ',"format_version":1,"generated_at":' + _json(_portable(timezone.now())))
        _write(output, ',"datasets":{')

        for index, (name, model) in enumerate(BUSINESS_DATASETS):
            if index:
                _write(output, ",")
            _write(output, _json(name) + ":[")
            fields = {field.attname: field for field in model._meta.concrete_fields}

            def rows():
                for instance in model._base_manager.order_by(model._meta.pk.name).iterator(chunk_size=1000):
                    row = {}
                    for field_name in BUSINESS_FIELDS[name]:
                        field = fields[field_name]
                        value = getattr(instance, field_name)
                        row[field_name] = _portable(value)
                        if field.is_relation and field.related_model == user_model and value is not None:
                            user_ids.add(value)
                    yield row

            manifest[name] = _write_rows(output, rows())
            _write(output, "]")

        _write(output, '},"users":[')
        users = (
            {"id": user.pk, "username": user.username, "email": user.email}
            for user in user_model._base_manager.filter(pk__in=user_ids).order_by("pk").iterator(chunk_size=1000)
        )
        manifest["users"] = _write_rows(output, users)
        if manifest["users"]["count"] != len(user_ids):
            raise ValueError("A business record references a missing user")
        _write(output, '],"manifest":' + _json(manifest) + "}")
    output.seek(0)


def build_business_transfer():
    """Materialize a snapshot for tests and small internal callers."""
    output = io.BytesIO()
    write_business_transfer(output)
    return json.load(output)


def _validate_schema_and_tenants():
    business_models = {model for _, model in BUSINESS_DATASETS}
    for name, model in BUSINESS_DATASETS:
        fields = {field.attname: field for field in model._meta.concrete_fields}
        if set(fields) != set(BUSINESS_FIELDS[name]):
            raise ValueError(f"Business transfer schema changed for {name}; update the format version")

        if name == "organizations":
            continue
        for field in fields.values():
            if not field.is_relation or field.related_model not in business_models:
                continue
            related = model._base_manager.filter(**{f"{field.attname}__isnull": False})
            if field.related_model._meta.label_lower == "organizations.organization":
                invalid = related.exclude(**{field.attname: F("organization_id")})
            else:
                invalid = related.exclude(
                    **{f"{field.name}__organization_id": F("organization_id")}
                )
            if invalid.exists():
                raise ValueError("A business relation crosses organizations")


def _write_rows(output, rows):
    digest = hashlib.sha256()
    digest.update(b"[")
    count = 0
    for row in rows:
        if count:
            _write(output, ",")
            digest.update(b",")
        encoded = _json(row).encode("utf-8")
        output.write(encoded)
        digest.update(encoded)
        count += 1
    digest.update(b"]")
    return {"count": count, "sha256": digest.hexdigest()}


def _json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _write(output, value):
    output.write(value.encode("utf-8"))


def _portable(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat(timespec="microseconds")
    if isinstance(value, (date, time)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _portable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_portable(item) for item in value]
    return value

"""Validate the versioned CRM business transfer before database writes."""

import hashlib
import json

from django.contrib.auth import get_user_model

from .business_transfer import FORMAT, FORMAT_VERSION
from .business_transfer_fields import BUSINESS_FIELDS
from .business_transfer_schema import BUSINESS_DATASETS


class BusinessImportError(ValueError):
    pass


def load_business_transfer(input_file):
    """Parse and validate a transfer before any database writes."""
    try:
        transfer = json.load(input_file)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise BusinessImportError("The transfer is not valid UTF-8 JSON") from error
    if not isinstance(transfer, dict) or set(transfer) != {
        "format", "format_version", "generated_at", "users", "datasets", "manifest"
    }:
        raise BusinessImportError("The transfer envelope is incomplete")
    if transfer["format"] != FORMAT or transfer["format_version"] != FORMAT_VERSION:
        raise BusinessImportError("Unsupported CRM business transfer format")

    datasets = transfer["datasets"]
    names = {name for name, _ in BUSINESS_DATASETS}
    if not isinstance(datasets, dict) or set(datasets) != names:
        raise BusinessImportError("The transfer has missing or unknown datasets")
    if not isinstance(transfer["users"], list):
        raise BusinessImportError("The transfer has invalid user references")

    all_rows = {"users": transfer["users"], **datasets}
    if not isinstance(transfer["manifest"], dict) or set(transfer["manifest"]) != set(all_rows):
        raise BusinessImportError("The transfer manifest is incomplete")
    for name, rows in all_rows.items():
        if not isinstance(rows, list):
            raise BusinessImportError(f"{name} must contain a list of records")
        digest = hashlib.sha256(_canonical(rows)).hexdigest()
        if transfer["manifest"][name] != {"count": len(rows), "sha256": digest}:
            raise BusinessImportError(f"{name} failed its count or checksum")

    validate_business_transfer(transfer)
    return transfer


def validate_business_transfer(transfer):
    users = transfer["users"]
    if any(not isinstance(user, dict) or set(user) != {"id", "username", "email"}
           or not isinstance(user["id"], int) or isinstance(user["id"], bool)
           or not isinstance(user["username"], str) or not isinstance(user["email"], str)
           for user in users):
        raise BusinessImportError("Invalid user reference")
    user_ids = [user["id"] for user in users]
    if len(user_ids) != len(set(user_ids)):
        raise BusinessImportError("Duplicate user reference")
    user_ids = set(user_ids)

    ids_by_model = {}
    for name, model in BUSINESS_DATASETS:
        fields = {field.attname: field for field in model._meta.concrete_fields}
        rows = transfer["datasets"][name]
        if any(not isinstance(row, dict) or set(row) != set(BUSINESS_FIELDS[name]) for row in rows):
            raise BusinessImportError(f"{name} has an invalid field set")
        ids = [row[model._meta.pk.attname] for row in rows]
        if len(ids) != len(set(ids)):
            raise BusinessImportError(f"{name} has duplicate identifiers")
        ids_by_model[model] = {row[model._meta.pk.attname]: row for row in rows}
        for row in rows:
            for field in fields.values():
                if not field.is_relation:
                    continue
                reference = row[field.attname]
                if reference is None:
                    continue
                if field.related_model == get_user_model():
                    if reference not in user_ids:
                        raise BusinessImportError(f"{name} references a missing user")
                elif field.related_model in ids_by_model:
                    target = ids_by_model[field.related_model].get(reference)
                    if target is None:
                        raise BusinessImportError(f"{name} references a missing business record")
                    if name != "organizations":
                        organization_id = row["organization_id"]
                        target_organization_id = target.get("organization_id", target.get("id"))
                        if organization_id != target_organization_id:
                            raise BusinessImportError(f"{name} crosses organizations")
                else:
                    raise BusinessImportError(f"{name} references a dataset not in the transfer")
    _validate_timeline_sources(transfer["datasets"], ids_by_model)


def _validate_timeline_sources(datasets, ids_by_model):
    by_name = dict(BUSINESS_DATASETS)
    source_models = {
        "company": by_name["companies"],
        "contact": by_name["contacts"],
        "deal": by_name["deals"],
        "task": by_name["tasks"],
        "subscription": by_name["customer_subscriptions"],
        "payment": by_name["payments"],
    }
    for row in datasets["company_timeline_events"]:
        source_type, source_id = row["source_type"], row["source_id"]
        if not source_id:
            continue
        model = source_models.get(source_type)
        if model is None:
            raise BusinessImportError("Timeline event has an unknown source type")
        source = ids_by_model[model].get(source_id)
        if source is None:
            continue  # Historical events may outlive the source record.
        if source.get("organization_id") != row["organization_id"]:
            raise BusinessImportError("Timeline source crosses organizations")
        if source_type == "company" and source["id"] != row["company_id"]:
            raise BusinessImportError("Timeline source points to a different customer")
        if source.get("company_id", row["company_id"]) != row["company_id"]:
            raise BusinessImportError("Timeline source points to a different customer")
        if source_type == "payment":
            charge = ids_by_model[by_name["charges"]][source["charge_id"]]
            subscription = ids_by_model[by_name["customer_subscriptions"]][
                charge["subscription_id"]
            ]
            if subscription["company_id"] != row["company_id"]:
                raise BusinessImportError("Timeline source points to a different customer")


def _canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

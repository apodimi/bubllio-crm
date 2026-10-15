from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from .errors import ManifestVerificationError, RequestValidationError
from .versioning import StableVersion


_SHA = re.compile(r"^[0-9a-f]{40}$")
_DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")
_POLICIES = {"online_safe", "maintenance", "irreversible"}


@dataclass(frozen=True)
class ReleaseManifest:
    repository: str
    version: StableVersion
    commit_sha: str
    image_digests: dict[str, str]
    minimum_version: StableVersion
    maximum_version: StableVersion
    migration_policy: str
    expected_schema: str
    health_timeout_seconds: int
    rollback_compatible: bool


def canonical_manifest_bytes(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def parse_verified_manifest(
    raw_manifest: object,
    expected_repository: str,
    expected_version: StableVersion,
    current_version: StableVersion,
) -> ReleaseManifest:
    if not isinstance(raw_manifest, dict):
        raise ManifestVerificationError("Manifest must be an object")

    allowed = {
        "repository",
        "version",
        "commit_sha",
        "image_digests",
        "min_version",
        "max_version",
        "migration_policy",
        "expected_schema",
        "health_timeout_seconds",
        "rollback_compatible",
    }
    if set(raw_manifest) != allowed:
        raise ManifestVerificationError("Manifest fields do not match the supported schema")
    try:
        repository = raw_manifest["repository"]
        version = StableVersion.parse(raw_manifest["version"])
        minimum = StableVersion.parse(raw_manifest["min_version"])
        maximum = StableVersion.parse(raw_manifest["max_version"])
        commit_sha = raw_manifest["commit_sha"]
        image_digests = raw_manifest["image_digests"]
        policy = raw_manifest["migration_policy"]
        expected_schema = raw_manifest["expected_schema"]
        health_timeout = raw_manifest["health_timeout_seconds"]
        rollback_compatible = raw_manifest["rollback_compatible"]
    except (KeyError, TypeError, ValueError, RequestValidationError) as exc:
        raise ManifestVerificationError("Manifest values are invalid") from exc

    if repository != expected_repository or version != expected_version:
        raise ManifestVerificationError("Manifest target is not allowlisted")
    if not minimum <= current_version <= maximum:
        raise ManifestVerificationError("Installed version is outside the supported upgrade range")
    if version <= current_version:
        raise ManifestVerificationError("Downgrades and same-version installs are not supported")
    if not isinstance(commit_sha, str) or not _SHA.fullmatch(commit_sha):
        raise ManifestVerificationError("commit_sha is invalid")
    if not isinstance(image_digests, dict) or not image_digests:
        raise ManifestVerificationError("image_digests must not be empty")
    if not all(
        isinstance(name, str)
        and re.fullmatch(r"[a-z0-9][a-z0-9_.-]*", name)
        and isinstance(digest, str)
        and _DIGEST.fullmatch(digest)
        for name, digest in image_digests.items()
    ):
        raise ManifestVerificationError("image_digests are invalid")
    if policy not in _POLICIES:
        raise ManifestVerificationError("migration_policy is invalid")
    if not isinstance(expected_schema, str) or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,128}", expected_schema):
        raise ManifestVerificationError("expected_schema is invalid")
    if not isinstance(health_timeout, int) or not 5 <= health_timeout <= 900:
        raise ManifestVerificationError("health_timeout_seconds is invalid")
    if not isinstance(rollback_compatible, bool):
        raise ManifestVerificationError("rollback_compatible must be boolean")

    return ReleaseManifest(
        repository=repository,
        version=version,
        commit_sha=commit_sha,
        image_digests=dict(image_digests),
        minimum_version=minimum,
        maximum_version=maximum,
        migration_policy=policy,
        expected_schema=expected_schema,
        health_timeout_seconds=health_timeout,
        rollback_compatible=rollback_compatible,
    )

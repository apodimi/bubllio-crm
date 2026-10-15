import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
VERSION_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")
SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")
DIGEST_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")
REPOSITORY_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
POLICY_FIELDS = {
    "version",
    "min_version",
    "max_version",
    "migration_policy",
    "expected_schema",
    "health_timeout_seconds",
    "rollback_compatible",
}
SCHEMA_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")


def parse_args():
    parser = argparse.ArgumentParser(description="Create a canonical Bubllio release manifest")
    parser.add_argument("--repository", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--commit-sha", required=True)
    parser.add_argument("--backend-digest", required=True)
    parser.add_argument("--frontend-digest", required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def fail(message):
    raise SystemExit(message)


def main():
    args = parse_args()
    if REPOSITORY_PATTERN.fullmatch(args.repository) is None:
        fail("Repository must use owner/name format")
    if VERSION_PATTERN.fullmatch(args.version) is None:
        fail("Version must use stable MAJOR.MINOR.PATCH format")
    if SHA_PATTERN.fullmatch(args.commit_sha) is None:
        fail("Commit SHA must be a full lowercase Git SHA")
    if DIGEST_PATTERN.fullmatch(args.backend_digest) is None:
        fail("Backend image digest must be sha256:<64 lowercase hex characters>")
    if DIGEST_PATTERN.fullmatch(args.frontend_digest) is None:
        fail("Frontend image digest must be sha256:<64 lowercase hex characters>")

    policy_path = ROOT / "release" / "policies" / f"{args.version}.json"
    try:
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Could not read release policy: {exc}")
    if not isinstance(policy, dict) or set(policy) != POLICY_FIELDS:
        fail("Release policy fields do not match the supported schema")
    if policy["version"] != args.version:
        fail("Release policy version does not match the requested version")
    for field in ("min_version", "max_version"):
        if not isinstance(policy[field], str) or VERSION_PATTERN.fullmatch(policy[field]) is None:
            fail(f"Release policy {field} must use stable MAJOR.MINOR.PATCH format")
    if policy["migration_policy"] not in {"online_safe", "maintenance", "irreversible"}:
        fail("Release policy has an unsupported migration policy")
    if (
        not isinstance(policy["expected_schema"], str)
        or SCHEMA_PATTERN.fullmatch(policy["expected_schema"]) is None
    ):
        fail("Release policy expected_schema is invalid")
    if (
        not isinstance(policy["health_timeout_seconds"], int)
        or isinstance(policy["health_timeout_seconds"], bool)
        or not 5 <= policy["health_timeout_seconds"] <= 900
    ):
        fail("Release policy health_timeout_seconds must be between 5 and 900")
    if not isinstance(policy["rollback_compatible"], bool):
        fail("Release policy rollback_compatible must be boolean")

    manifest = {
        "repository": args.repository,
        "version": args.version,
        "commit_sha": args.commit_sha,
        "image_digests": {
            "backend": args.backend_digest,
            "frontend": args.frontend_digest,
        },
        "min_version": policy["min_version"],
        "max_version": policy["max_version"],
        "migration_policy": policy["migration_policy"],
        "expected_schema": policy["expected_schema"],
        "health_timeout_seconds": policy["health_timeout_seconds"],
        "rollback_compatible": policy["rollback_compatible"],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(
        json.dumps(manifest, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    )


if __name__ == "__main__":
    main()

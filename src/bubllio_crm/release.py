import os
import re
from importlib.metadata import PackageNotFoundError, version


VERSION_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")
COMMIT_PATTERN = re.compile(r"^[0-9a-f]{40}$")


def current_version():
    """Return the immutable release version baked into the running build."""

    configured_version = os.environ.get("BUBLLIO_RELEASE_VERSION", "").strip()
    if configured_version:
        if VERSION_PATTERN.fullmatch(configured_version) is None:
            return "development"
        return configured_version

    try:
        installed_version = version("bubllio-crm")
    except PackageNotFoundError:
        return "development"

    return installed_version if VERSION_PATTERN.fullmatch(installed_version) else "development"


def current_commit_sha():
    """Return a full lowercase Git commit SHA, or ``unknown`` outside a release build."""

    commit_sha = os.environ.get("BUBLLIO_RELEASE_SHA", "").strip().lower()
    return commit_sha if COMMIT_PATTERN.fullmatch(commit_sha) else "unknown"

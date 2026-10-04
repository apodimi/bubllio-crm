import json
import re
from importlib.metadata import PackageNotFoundError, version
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache


VERSION_PATTERN = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$")
REPOSITORY_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


def current_version():
    try:
        return version("bubllio-crm")
    except PackageNotFoundError:
        return "0.0.0"


def _version_parts(value):
    match = VERSION_PATTERN.fullmatch(value)
    if match is None:
        raise ValueError("Unsupported release version")
    return tuple(int(part) for part in match.groups())


def _base_result(status, installed_version, *, enabled=True):
    return {
        "status": status,
        "enabled": enabled,
        "current_version": installed_version,
        "latest_version": None,
        "update_available": False,
        "release_name": None,
        "release_url": None,
        "published_at": None,
    }


def get_update_status():
    installed_version = current_version()
    if not settings.BUBLLIO_UPDATE_CHECK_ENABLED:
        return _base_result("disabled", installed_version, enabled=False)

    repository = settings.BUBLLIO_UPDATE_REPOSITORY
    if REPOSITORY_PATTERN.fullmatch(repository) is None:
        return _base_result("unavailable", installed_version)

    cache_key = f"bubllio:update-status:{repository}:{installed_version}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        request = Request(
            f"https://api.github.com/repos/{repository}/releases/latest",
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": f"Bubllio-CRM/{installed_version}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        with urlopen(request, timeout=3) as response:
            payload = json.loads(response.read(65537))
        tag = payload["tag_name"]
        latest_parts = _version_parts(tag)
        latest_version = ".".join(str(part) for part in latest_parts)
        result = {
            "status": "ok",
            "enabled": True,
            "current_version": installed_version,
            "latest_version": latest_version,
            "update_available": latest_parts > _version_parts(installed_version),
            "release_name": payload.get("name") or tag,
            "release_url": f"https://github.com/{repository}/releases/tag/{tag}",
            "published_at": payload.get("published_at"),
        }
    except (KeyError, TypeError, ValueError, OSError, TimeoutError, json.JSONDecodeError):
        result = _base_result("unavailable", installed_version)

    cache.set(cache_key, result, timeout=max(60, settings.BUBLLIO_UPDATE_CHECK_TTL))
    return result

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from urllib.parse import urlsplit

from .config import ReleaseSourceConfig
from .errors import ManifestVerificationError
from .versioning import StableVersion


_MAX_MANIFEST_BYTES = 128 * 1024
_MAX_BUNDLE_BYTES = 1024 * 1024


class _AllowlistedRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, allowed_hosts: frozenset[str], max_redirects: int) -> None:
        self._allowed_hosts = allowed_hosts
        self._max_redirects = max_redirects

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        parsed = urlsplit(newurl)
        count = getattr(req, "_bubllio_redirect_count", 0)
        if (
            count >= self._max_redirects
            or parsed.scheme != "https"
            or parsed.hostname not in self._allowed_hosts
            or parsed.username
            or parsed.password
            or parsed.port not in {None, 443}
        ):
            raise urllib.error.HTTPError(
                req.full_url, code, "Redirect target is not allowlisted", headers, fp
            )
        redirected = urllib.request.Request(
            newurl,
            headers={
                "Accept": req.headers.get("Accept", "application/json"),
                "User-Agent": req.headers.get("User-agent", "bubllio-update-agent/0.1"),
            },
            method="GET",
        )
        redirected._bubllio_redirect_count = count + 1
        return redirected


@dataclass(frozen=True)
class ReleaseMaterial:
    manifest: dict[str, object]
    canonical_bytes: bytes
    bundle: bytes


class HttpReleaseSource:
    def __init__(self, config: ReleaseSourceConfig) -> None:
        self._config = config
        self._opener = urllib.request.build_opener(
            _AllowlistedRedirect(config.allowed_redirect_hosts, config.max_redirects)
        )

    def _fetch(self, template: str, version: StableVersion, limit: int) -> bytes:
        url = template.format(version=str(version))
        request = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": "bubllio-update-agent/0.1"},
            method="GET",
        )
        try:
            with self._opener.open(request, timeout=10) as response:
                declared = response.headers.get("Content-Length")
                if declared and int(declared) > limit:
                    raise ManifestVerificationError("Release artifact is too large")
                payload = response.read(limit + 1)
        except (OSError, ValueError, urllib.error.URLError) as exc:
            raise ManifestVerificationError("Release artifact could not be downloaded") from exc
        if len(payload) > limit:
            raise ManifestVerificationError("Release artifact is too large")
        return payload

    def load(self, version: StableVersion) -> ReleaseMaterial:
        manifest_bytes = self._fetch(
            self._config.manifest_url_template, version, _MAX_MANIFEST_BYTES
        )
        try:
            manifest = json.loads(manifest_bytes)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ManifestVerificationError("Release manifest is not valid JSON") from exc
        if not isinstance(manifest, dict):
            raise ManifestVerificationError("Release manifest must be an object")
        from .manifest import canonical_manifest_bytes

        canonical = canonical_manifest_bytes(manifest)
        if manifest_bytes.strip() != canonical:
            raise ManifestVerificationError("Release manifest is not canonical JSON")
        bundle = self._fetch(self._config.bundle_url_template, version, _MAX_BUNDLE_BYTES)
        return ReleaseMaterial(manifest=manifest, canonical_bytes=canonical, bundle=bundle)


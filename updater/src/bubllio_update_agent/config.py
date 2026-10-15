from __future__ import annotations

import json
import os
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import ConfigurationError
from .versioning import StableVersion


_REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_ENVIRONMENT_NAME = re.compile(r"^[A-Z][A-Z0-9_]*$")
_HOSTNAME = re.compile(
    r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+"
    r"[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?"
)


@dataclass(frozen=True)
class ComposeConfig:
    docker_executable: Path
    project_directory: Path
    compose_files: tuple[Path, ...]
    env_file: Path
    managed_release_env_file: Path
    release_variable: str
    images: dict[str, "ComposeImageConfig"]
    backup_executable: Path
    backup_arguments: tuple[str, ...]
    health_url: str


@dataclass(frozen=True)
class AgentConfig:
    installation_id: str
    repository: str
    current_version: StableVersion
    release_source: "ReleaseSourceConfig"
    manifest_verifier: "VerifierConfig"
    state_path: Path
    bind_host: str | None
    bind_port: int | None
    unix_socket_path: Path | None
    socket_group_gid: int | None
    request_max_age_seconds: int
    shared_secret: bytes
    provider: ComposeConfig


@dataclass(frozen=True)
class ComposeImageConfig:
    repository: str
    environment_variable: str
    services: tuple[str, ...]


@dataclass(frozen=True)
class ReleaseSourceConfig:
    manifest_url_template: str
    bundle_url_template: str
    allowed_redirect_hosts: frozenset[str]
    max_redirects: int


@dataclass(frozen=True)
class VerifierConfig:
    kind: str
    public_key: bytes | None = None
    cosign_executable: Path | None = None
    certificate_identity_template: str | None = None
    certificate_oidc_issuer: str | None = None


def _expect_mapping(value: object, name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ConfigurationError(f"{name} must be an object")
    return value


def _required_text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value:
        raise ConfigurationError(f"{key} must be a non-empty string")
    return value


def _resolve_inside(project_directory: Path, value: str, name: str) -> Path:
    candidate = Path(value)
    if candidate.is_absolute():
        resolved = candidate.resolve()
    else:
        resolved = (project_directory / candidate).resolve()
    if resolved != project_directory and project_directory not in resolved.parents:
        raise ConfigurationError(f"{name} must remain inside project_directory")
    return resolved


def _version_url_template(value: str, name: str) -> str:
    from urllib.parse import urlsplit

    if value.count("{version}") != 1:
        raise ConfigurationError(f"{name} must contain one {{version}} placeholder")
    without_version = value.replace("{version}", "")
    if "{" in without_version or "}" in without_version:
        raise ConfigurationError(f"{name} contains an unsupported placeholder")
    parsed = urlsplit(value.replace("{version}", "0.0.0"))
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ConfigurationError(f"{name} must be an HTTPS URL without credentials")
    if parsed.fragment:
        raise ConfigurationError(f"{name} must not contain a fragment")
    return value


def load_config(path: str | Path, environ: dict[str, str] | None = None) -> AgentConfig:
    environment = os.environ if environ is None else environ
    try:
        data = _expect_mapping(json.loads(Path(path).read_text(encoding="utf-8")), "config")
    except (OSError, json.JSONDecodeError) as exc:
        raise ConfigurationError("Cannot read configuration") from exc

    installation_id = _required_text(data, "installation_id")
    try:
        canonical_installation_id = str(uuid.UUID(installation_id))
    except ValueError as exc:
        raise ConfigurationError("installation_id must be a UUID") from exc
    if installation_id != canonical_installation_id:
        raise ConfigurationError("installation_id must be a canonical lowercase UUID")

    repository = _required_text(data, "repository")
    if not _REPOSITORY.fullmatch(repository):
        raise ConfigurationError("repository must use owner/name format")

    try:
        current_version = StableVersion.parse(_required_text(data, "current_version"))
    except Exception as exc:
        raise ConfigurationError("current_version must be a stable semantic version") from exc

    source_data = _expect_mapping(data.get("release_source"), "release_source")
    allowed_redirect_hosts = source_data.get("allowed_redirect_hosts", [])
    if not isinstance(allowed_redirect_hosts, list) or not all(
        isinstance(host, str) and _HOSTNAME.fullmatch(host)
        for host in allowed_redirect_hosts
    ):
        raise ConfigurationError("allowed_redirect_hosts must contain exact lowercase hostnames")
    max_redirects = source_data.get("max_redirects", 3)
    if not isinstance(max_redirects, int) or not 0 <= max_redirects <= 5:
        raise ConfigurationError("max_redirects must be between 0 and 5")
    release_source = ReleaseSourceConfig(
        manifest_url_template=_version_url_template(
            _required_text(source_data, "manifest_url_template"), "manifest_url_template"
        ),
        bundle_url_template=_version_url_template(
            _required_text(source_data, "bundle_url_template"), "bundle_url_template"
        ),
        allowed_redirect_hosts=frozenset(allowed_redirect_hosts),
        max_redirects=max_redirects,
    )

    verifier_data = _expect_mapping(data.get("manifest_verifier"), "manifest_verifier")
    verifier_kind = _required_text(verifier_data, "kind")
    if verifier_kind == "sigstore_cosign":
        cosign_executable = Path(_required_text(verifier_data, "cosign_executable"))
        if not cosign_executable.is_absolute():
            raise ConfigurationError("cosign_executable must be absolute")
        identity_template = _required_text(verifier_data, "certificate_identity_template")
        expected_prefix = f"https://github.com/{repository}/.github/workflows/"
        if (
            not identity_template.startswith(expected_prefix)
            or not identity_template.endswith("@refs/tags/v{version}")
            or identity_template.count("{version}") != 1
            or "{" in identity_template.replace("{version}", "")
            or "}" in identity_template.replace("{version}", "")
        ):
            raise ConfigurationError(
                "certificate_identity_template must pin the repository, workflow, and release tag"
            )
        issuer = _required_text(verifier_data, "certificate_oidc_issuer")
        if not issuer.startswith("https://"):
            raise ConfigurationError("certificate_oidc_issuer must be HTTPS")
        manifest_verifier = VerifierConfig(
            kind=verifier_kind,
            cosign_executable=cosign_executable.resolve(),
            certificate_identity_template=identity_template,
            certificate_oidc_issuer=issuer,
        )
    elif verifier_kind == "ed25519":
        import base64

        try:
            public_key = base64.b64decode(_required_text(verifier_data, "public_key"), validate=True)
        except ValueError as exc:
            raise ConfigurationError("public_key must be base64") from exc
        if len(public_key) != 32:
            raise ConfigurationError("public_key must be a raw Ed25519 public key")
        manifest_verifier = VerifierConfig(kind=verifier_kind, public_key=public_key)
    else:
        raise ConfigurationError("manifest_verifier.kind is unsupported")

    secret = environment.get("BUBLLIO_UPDATE_AGENT_SECRET", "").encode()
    if len(secret) < 32:
        raise ConfigurationError("BUBLLIO_UPDATE_AGENT_SECRET must contain at least 32 bytes")

    provider_data = _expect_mapping(data.get("provider"), "provider")
    if provider_data.get("kind") != "docker_compose":
        raise ConfigurationError("Only the docker_compose provider is available in this release")
    project_directory = Path(_required_text(provider_data, "project_directory"))
    if not project_directory.is_absolute():
        raise ConfigurationError("project_directory must be absolute")
    project_directory = project_directory.resolve()
    docker_executable = Path(_required_text(provider_data, "docker_executable"))
    if not docker_executable.is_absolute():
        raise ConfigurationError("docker_executable must be absolute")

    compose_values = provider_data.get("compose_files")
    if not isinstance(compose_values, list) or not compose_values:
        raise ConfigurationError("compose_files must be a non-empty list")
    compose_files = tuple(
        _resolve_inside(project_directory, value, "compose_files")
        for value in compose_values
        if isinstance(value, str) and value
    )
    if len(compose_files) != len(compose_values):
        raise ConfigurationError("compose_files entries must be non-empty strings")

    env_file = _resolve_inside(
        project_directory, _required_text(provider_data, "env_file"), "env_file"
    )
    managed_release_env_file = _resolve_inside(
        project_directory,
        _required_text(provider_data, "managed_release_env_file"),
        "managed_release_env_file",
    )
    if managed_release_env_file == env_file:
        raise ConfigurationError("managed_release_env_file must differ from env_file")
    release_variable = _required_text(provider_data, "release_variable")
    if not _ENVIRONMENT_NAME.fullmatch(release_variable):
        raise ConfigurationError("release_variable must be an uppercase environment name")
    raw_images = _expect_mapping(provider_data.get("images"), "images")
    images: dict[str, ComposeImageConfig] = {}
    configured_services: set[str] = set()
    for name, raw_image in raw_images.items():
        if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_.-]*", name):
            raise ConfigurationError("images keys are invalid")
        image = _expect_mapping(raw_image, f"images.{name}")
        image_repository = _required_text(image, "repository")
        if not re.fullmatch(r"[A-Za-z0-9./:_-]+", image_repository) or "@" in image_repository:
            raise ConfigurationError("image repository is invalid")
        image_variable = _required_text(image, "environment_variable")
        if not _ENVIRONMENT_NAME.fullmatch(image_variable):
            raise ConfigurationError("image environment variable is invalid")
        raw_services = image.get("services")
        if not isinstance(raw_services, list) or not raw_services or not all(
            isinstance(service, str)
            and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", service)
            for service in raw_services
        ):
            raise ConfigurationError("image services must be a non-empty list of safe names")
        services = tuple(raw_services)
        if len(set(services)) != len(services) or configured_services.intersection(services):
            raise ConfigurationError("Compose services may be assigned to only one image")
        configured_services.update(services)
        images[name] = ComposeImageConfig(image_repository, image_variable, services)
    if not images:
        raise ConfigurationError("images must not be empty")

    backup_executable = Path(_required_text(provider_data, "backup_executable"))
    if not backup_executable.is_absolute():
        raise ConfigurationError("backup_executable must be absolute")
    backup_arguments = provider_data.get("backup_arguments", [])
    if not isinstance(backup_arguments, list) or not all(
        isinstance(item, str) for item in backup_arguments
    ):
        raise ConfigurationError("backup_arguments must be a list of strings")

    health_url = _required_text(provider_data, "health_url")
    if not re.fullmatch(r"https?://(?:127\.0\.0\.1|localhost)(?::\d+)?/[^\s]*", health_url):
        raise ConfigurationError("health_url must target loopback over HTTP(S)")

    state_path = Path(_required_text(data, "state_path"))
    if not state_path.is_absolute():
        raise ConfigurationError("state_path must be absolute")
    raw_socket_path = data.get("unix_socket_path")
    if raw_socket_path is not None and (
        not isinstance(raw_socket_path, str) or not Path(raw_socket_path).is_absolute()
    ):
        raise ConfigurationError("unix_socket_path must be an absolute path")
    if raw_socket_path is not None and ({"bind_host", "bind_port"} & set(data)):
        raise ConfigurationError("unix_socket_path and TCP bind settings are mutually exclusive")
    unix_socket_path = Path(raw_socket_path).resolve() if raw_socket_path else None
    if unix_socket_path is not None and len(os.fsencode(unix_socket_path)) > 100:
        raise ConfigurationError("unix_socket_path is too long")
    socket_group_gid = data.get("socket_group_gid")
    if socket_group_gid is not None and (
        not isinstance(socket_group_gid, int)
        or isinstance(socket_group_gid, bool)
        or socket_group_gid < 0
    ):
        raise ConfigurationError("socket_group_gid must be a non-negative integer or null")
    bind_host = None if unix_socket_path else data.get("bind_host", "127.0.0.1")
    if bind_host is not None and bind_host not in {"127.0.0.1", "::1", "localhost"}:
        raise ConfigurationError("bind_host must be loopback")
    bind_port = None if unix_socket_path else data.get("bind_port", 9080)
    max_age = data.get("request_max_age_seconds", 60)
    if bind_port is not None and (not isinstance(bind_port, int) or not 1 <= bind_port <= 65535):
        raise ConfigurationError("bind_port is invalid")
    if not isinstance(max_age, int) or not 5 <= max_age <= 300:
        raise ConfigurationError("request_max_age_seconds must be between 5 and 300")

    return AgentConfig(
        installation_id=installation_id,
        repository=repository,
        current_version=current_version,
        release_source=release_source,
        manifest_verifier=manifest_verifier,
        state_path=state_path,
        bind_host=bind_host,
        bind_port=bind_port,
        unix_socket_path=unix_socket_path,
        socket_group_gid=socket_group_gid,
        request_max_age_seconds=max_age,
        shared_secret=secret,
        provider=ComposeConfig(
            docker_executable=docker_executable.resolve(),
            project_directory=project_directory,
            compose_files=compose_files,
            env_file=env_file,
            managed_release_env_file=managed_release_env_file,
            release_variable=release_variable,
            images=images,
            backup_executable=backup_executable.resolve(),
            backup_arguments=tuple(backup_arguments),
            health_url=health_url,
        ),
    )


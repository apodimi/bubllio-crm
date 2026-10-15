from __future__ import annotations

import base64
import binascii
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Protocol

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from .config import VerifierConfig
from .errors import ManifestVerificationError
from .versioning import StableVersion


class ManifestVerifier(Protocol):
    def verify(self, manifest: bytes, bundle: bytes, version: StableVersion) -> None: ...


class Ed25519Verifier:
    def __init__(self, public_key: bytes) -> None:
        self._public_key = Ed25519PublicKey.from_public_bytes(public_key)

    def verify(self, manifest: bytes, bundle: bytes, version: StableVersion) -> None:
        del version
        try:
            signature = base64.b64decode(bundle.strip(), validate=True)
            self._public_key.verify(signature, manifest)
        except (ValueError, binascii.Error, InvalidSignature) as exc:
            raise ManifestVerificationError("Invalid manifest signature") from exc


class CosignVerifier:
    def __init__(
        self,
        executable: Path,
        identity_template: str,
        issuer: str,
        temporary_directory: Path,
    ) -> None:
        self._executable = executable
        self._identity_template = identity_template
        self._issuer = issuer
        self._temporary_directory = temporary_directory

    def verify(self, manifest: bytes, bundle: bytes, version: StableVersion) -> None:
        self._temporary_directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        try:
            with tempfile.TemporaryDirectory(
                prefix="verify-", dir=self._temporary_directory
            ) as directory:
                os.chmod(directory, 0o700)
                manifest_path = Path(directory) / "manifest.json"
                bundle_path = Path(directory) / "manifest.sigstore"
                manifest_path.write_bytes(manifest)
                bundle_path.write_bytes(bundle)
                os.chmod(manifest_path, 0o600)
                os.chmod(bundle_path, 0o600)
                result = subprocess.run(
                    [
                        str(self._executable),
                        "verify-blob",
                        "--bundle",
                        str(bundle_path),
                        "--certificate-identity",
                        self._identity_template.format(version=str(version)),
                        "--certificate-oidc-issuer",
                        self._issuer,
                        str(manifest_path),
                    ],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=30,
                    check=False,
                )
        except (OSError, subprocess.SubprocessError) as exc:
            raise ManifestVerificationError("Manifest verifier could not run") from exc
        if result.returncode != 0:
            raise ManifestVerificationError("Manifest signature or identity is invalid")


def build_verifier(config: VerifierConfig, state_directory: Path) -> ManifestVerifier:
    if config.kind == "ed25519" and config.public_key is not None:
        return Ed25519Verifier(config.public_key)
    if (
        config.kind == "sigstore_cosign"
        and config.cosign_executable is not None
        and config.certificate_identity_template is not None
        and config.certificate_oidc_issuer is not None
    ):
        return CosignVerifier(
            config.cosign_executable,
            config.certificate_identity_template,
            config.certificate_oidc_issuer,
            state_directory / "verification",
        )
    raise ManifestVerificationError("Manifest verifier configuration is incomplete")

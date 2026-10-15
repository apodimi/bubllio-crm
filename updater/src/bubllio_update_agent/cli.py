from __future__ import annotations

import argparse
import json
from pathlib import Path

from .adapters import DockerComposeAdapter
from .api import AgentServer, AgentUnixServer
from .config import load_config
from .manifest import canonical_manifest_bytes, parse_verified_manifest
from .process_lock import AgentProcessLock
from .release_source import HttpReleaseSource
from .service import UpdateService
from .store import JobStore
from .verifier import build_verifier
from .versioning import StableVersion


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="bubllio-update-agent")
    commands = parser.add_subparsers(dest="command", required=True)
    serve = commands.add_parser("serve", help="Run the loopback HTTP API")
    serve.add_argument("--config", required=True, type=Path)
    validate = commands.add_parser(
        "validate-manifest", help="Verify and validate local release artifacts"
    )
    validate.add_argument("--config", required=True, type=Path)
    validate.add_argument("--manifest", required=True, type=Path)
    validate.add_argument("--bundle", required=True, type=Path)
    validate.add_argument("--target-version", required=True)
    canonicalize = commands.add_parser(
        "canonicalize-manifest", help="Write canonical JSON for release signing"
    )
    canonicalize.add_argument("--input", required=True, type=Path)
    canonicalize.add_argument("--output", required=True, type=Path)
    return parser


def main() -> None:
    args = _parser().parse_args()
    if args.command == "canonicalize-manifest":
        value = json.loads(args.input.read_text(encoding="utf-8"))
        args.output.write_bytes(canonical_manifest_bytes(value))
        return

    config = load_config(args.config)
    state_directory = config.state_path.parent
    verifier = build_verifier(config.manifest_verifier, state_directory)
    if args.command == "validate-manifest":
        target = StableVersion.parse(args.target_version)
        raw = json.loads(args.manifest.read_text(encoding="utf-8"))
        canonical = canonical_manifest_bytes(raw)
        if args.manifest.read_bytes().strip() != canonical:
            raise SystemExit("manifest is not canonical JSON")
        verifier.verify(canonical, args.bundle.read_bytes(), target)
        parse_verified_manifest(raw, config.repository, target, config.current_version)
        print("manifest is valid")
        return

    # The lifetime lock must precede recovery: a second process must never mark
    # the first process's in-flight job as interrupted.
    with AgentProcessLock(state_directory / "agent.lock"):
        store = JobStore(config.state_path)
        store.recover_interrupted()
        service = UpdateService(
            config,
            store,
            HttpReleaseSource(config.release_source),
            verifier,
            DockerComposeAdapter(config.provider),
        )
        server = (
            AgentUnixServer(config, service)
            if config.unix_socket_path is not None
            else AgentServer(config, service)
        )
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


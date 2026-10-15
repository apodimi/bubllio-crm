from typing import Protocol

from ..manifest import ReleaseManifest


class DeploymentAdapter(Protocol):
    def preflight(self, manifest: ReleaseManifest) -> None: ...

    def backup(self) -> None: ...

    def deploy(self, manifest: ReleaseManifest) -> None: ...

    def verify(self, manifest: ReleaseManifest) -> None: ...


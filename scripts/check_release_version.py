import json
import re
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


with (ROOT / "pyproject.toml").open("rb") as pyproject_file:
    backend_version = tomllib.load(pyproject_file)["project"]["version"]

with (ROOT / "frontend" / "package.json").open(encoding="utf-8") as package_file:
    frontend_version = json.load(package_file)["version"]

if not SEMVER.fullmatch(backend_version):
    raise SystemExit(f"Backend version is not MAJOR.MINOR.PATCH: {backend_version}")

if backend_version != frontend_version:
    raise SystemExit(
        "Release versions do not match: "
        f"pyproject.toml={backend_version}, frontend/package.json={frontend_version}"
    )

print(f"Bubllio CRM release version: {backend_version}")

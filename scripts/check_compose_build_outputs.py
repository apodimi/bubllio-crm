import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path


def duplicate_build_outputs(compose_file: Path) -> dict[str, list[str]]:
    result = subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            str(compose_file),
            "config",
            "--format",
            "json",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    services = json.loads(result.stdout)["services"]
    outputs: dict[str, list[str]] = defaultdict(list)
    for service_name, service in services.items():
        image = service.get("image")
        if service.get("build") is not None and image:
            outputs[image].append(service_name)
    return {
        image: service_names
        for image, service_names in outputs.items()
        if len(service_names) > 1
    }


def main() -> None:
    compose_files = [Path(argument) for argument in sys.argv[1:]]
    if not compose_files:
        raise SystemExit("Pass at least one Compose file")

    failures = []
    for compose_file in compose_files:
        duplicates = duplicate_build_outputs(compose_file)
        for image, service_names in duplicates.items():
            failures.append(
                f"{compose_file}: services {', '.join(sorted(service_names))} "
                f"all build image {image}"
            )

    if failures:
        raise SystemExit("\n".join(failures))

    print("Compose build outputs are unique")


if __name__ == "__main__":
    main()

import argparse
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description="Extract one version from CHANGELOG.md")
    parser.add_argument("version")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    if re.fullmatch(r"\d+\.\d+\.\d+", args.version) is None:
        raise SystemExit("Version must use stable MAJOR.MINOR.PATCH format")

    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    heading = re.search(
        rf"^## {re.escape(args.version)}(?:\s+—[^\n]*)?\n(?P<body>.*?)(?=^## \d+\.\d+\.\d+|\Z)",
        changelog,
        flags=re.MULTILINE | re.DOTALL,
    )
    if heading is None or not heading.group("body").strip():
        raise SystemExit(f"CHANGELOG.md has no notes for {args.version}")

    args.output.write_text(heading.group("body").strip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

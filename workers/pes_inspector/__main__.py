"""No directory discovery and no writes: JSON is emitted to stdout."""
import argparse
import json
from .inspector import inspect_file


def main():
    parser = argparse.ArgumentParser(description="Inspeksi metadata PES read-only, input file eksplisit; tidak mengekstrak/menulis.")
    parser.add_argument("files", nargs="+")
    args = parser.parse_args()
    results = []
    for path in args.files:
        try:
            results.append(inspect_file(path))
        except (OSError, ValueError) as error:
            results.append({"path": path, "status": "read_error", "error": str(error)})
    print(json.dumps(results, indent=2, allow_nan=False))
    return 1 if any(r["status"] in ("read_error", "rejected_structure", "source_changed") for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())

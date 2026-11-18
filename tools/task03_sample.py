"""Inspect the one authorized local sample and stage its three FPK members.

Run from the project root: python -m tools.task03_sample
Never discovers or writes to a game installation. Every invocation has a new run directory.
"""
import json
import uuid
from pathlib import Path
from workers.pes_inspector import inspect_file
from workers.pes_inspector.staging import stage_entry


def main():
    project = Path(__file__).resolve().parents[1]
    sample = project / "tests/fixtures/pes-face-local/100112"
    experiment = project / "analysis/task03"
    if not sample.is_dir():
        raise FileNotFoundError("Sampel lokal 100112 belum tersedia; tidak ada pencarian otomatis ke game")
    run = experiment / ("run-" + uuid.uuid4().hex[:12])
    run.mkdir(parents=True, exist_ok=False)
    inventory = [inspect_file(path) for path in sorted(sample.rglob("*")) if path.is_file()]
    fpk = sample / "#Win/face.fpk"
    outer = next(item for item in inventory if Path(item["path"]) == fpk.resolve())
    expected = ["face_diff.bin", "face_high.fmdl", "hair_high.fmdl"]
    if [e["name"] for e in outer.get("entries", [])] != expected:
        raise ValueError("Sampel berbeda dari allowlist pemain 100112 yang diaudit")
    staged = [stage_entry(fpk, i, run) for i in range(3)]
    inner = [inspect_file(item["output"]) for item in staged]
    result = {"sample": str(sample), "run": str(run), "inventory": inventory, "staged": staged,
              "inner_assets": inner, "geometry_import": "not_attempted", "pes_export": "not_attempted",
              "round_trip": "not_tested", "game_compatibility": "unverified"}
    with (run / "inspection.json").open("x", encoding="utf-8") as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(run)
    for item in inventory + inner:
        print(Path(item["path"]).name, item.get("format"), item["status"], "; ".join(item["issues"]))


if __name__ == "__main__":
    main()

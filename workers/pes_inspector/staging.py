"""Copy one already-validated FPK range into an explicit experiment directory."""
import hashlib
from pathlib import Path
from .binary import CHUNK, Reader, InspectionError, stream_sha256
from .formats import safe_member_name
from .inspector import inspect_file


def stage_entry(source, index, output_root):
    source, output_root = Path(source), Path(output_root)
    if any(p.is_symlink() or (hasattr(p, "is_junction") and p.is_junction()) for p in [output_root, *output_root.parents]):
        raise InspectionError("Output root tidak boleh melalui symlink/junction")
    root = output_root.resolve()
    if not root.is_dir():
        raise InspectionError("Output root harus direktori eksperimen yang sudah dibuat")
    report = inspect_file(source)
    if report.get("format") not in ("FPK", "FPKD") or report["status"] != "metadata_inspected" or not report["source_unchanged"]:
        raise InspectionError("Container harus lolos inspeksi tanpa peringatan untuk staging")
    if not 0 <= index < len(report["entries"]):
        raise InspectionError("Indeks entry tidak valid")
    entry = report["entries"][index]
    if not entry["safe_path"] or not safe_member_name(entry["name"]) or not entry["filename_md5_match"]:
        raise InspectionError("Entry tidak aman")
    length = entry["payload_length"]
    if length > 64 * CHUNK:
        raise InspectionError("Batas staging per entry 64 MiB")
    # Flat, index-qualified output avoids interpreting any container directory tree.
    target = root / f"{index:04d}-{Path(entry['name']).name}"
    if target.exists() or target.resolve() == source.resolve():
        raise InspectionError("Output sudah ada atau sama dengan input")
    with source.open("rb") as stream:
        if stream_sha256(stream, report["size"]) != report["sha256_before"]:
            raise InspectionError("Container berubah sebelum staging")
        reader, digest = Reader(stream, report["size"], budget=length), hashlib.sha256()
        with target.open("xb") as output:
            for relative in range(0, length, CHUNK):
                block = reader.read(entry["payload_offset"] + relative, min(CHUNK, length - relative))
                output.write(block)
                digest.update(block)
        if stream_sha256(stream, report["size"]) != report["sha256_before"]:
            raise InspectionError("Container berubah saat staging; output tidak tervalidasi")
    with target.open("rb") as output:
        output_hash = stream_sha256(output, target.stat().st_size)
    if target.stat().st_size != length or output_hash != digest.hexdigest():
        raise InspectionError("Hash/ukuran output staging tidak cocok")
    return {"source": str(source.resolve()), "index": index, "internal_name": entry["name"],
            "payload_offset": entry["payload_offset"], "size": length,
            "output": str(target), "source_range_sha256": digest.hexdigest(), "output_sha256": output_hash,
            "container_sha256": report["sha256_before"]}

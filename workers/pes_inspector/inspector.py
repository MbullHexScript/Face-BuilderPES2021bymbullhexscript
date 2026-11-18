import os
from pathlib import Path
from .binary import Reader, InspectionError, stream_sha256
from . import formats


def inspect_file(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise InspectionError("Input harus satu regular file, bukan direktori/symlink")
    with path.open("rb") as stream:
        initial = os.fstat(stream.fileno())
        before = stream_sha256(stream, initial.st_size)
        reader = Reader(stream, initial.st_size)
        prefix = reader.read(0, min(64, initial.st_size))
        issues = []
        report = {"schema_version": 1, "path": str(path.resolve()), "size": initial.st_size,
                  "prefix_hex": prefix.hex(), "sha256_before": before, "issues": issues,
                  "evidence_level": "metadata_only", "game_compatibility": "unverified"}
        parser = formats.fpk if prefix.startswith(b"foxfpk") else {b"FMDL": formats.fmdl, b"FTEX": formats.ftex, b"FACE": formats.face}.get(prefix[:4])
        try:
            if parser:
                report.update(parser(reader, issues))
                report["status"] = "metadata_warnings" if issues else "metadata_inspected"
            else:
                report.update(format="unknown", status="unrecognized")
                if path.name.lower() == "face_diff.bin":
                    issues.append("Nama face_diff.bin adalah petunjuk saja; signature FACE tidak ditemukan")
                if prefix[4:8] == b"WESY" or prefix[:5] == b"CRIL":
                    issues.append("Kemungkinan wrapper/compression; tidak didekode")
        except InspectionError as error:
            report.update(status="rejected_structure", error=str(error))
        after = stream_sha256(stream, initial.st_size)
        final, current = os.fstat(stream.fileno()), path.stat()
        stable = before == after and (initial.st_size, initial.st_mtime_ns, initial.st_ino) == (final.st_size, final.st_mtime_ns, final.st_ino) == (current.st_size, current.st_mtime_ns, current.st_ino)
        report.update(sha256_after=after, source_unchanged=stable, metadata_bytes_read=reader.bytes_read)
        if not stable:
            report.update(status="source_changed", error="Input berubah saat inspeksi; hasil tidak dapat diterima")
        return report

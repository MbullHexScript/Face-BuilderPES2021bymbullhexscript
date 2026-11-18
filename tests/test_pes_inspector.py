"""Synthetic malformed/structural fixtures; real third-party assets stay optional."""
import hashlib
import io
import json
import struct
import tempfile
import unittest
from pathlib import Path
from workers.pes_inspector import inspect_file
from workers.pes_inspector.binary import Reader, InspectionError
from workers.pes_inspector.formats import safe_member_name
from workers.pes_inspector.staging import stage_entry


def container(name=b"face_high.fmdl", payload=b"FMDLtest"):
    offset = 96 + len(name)
    header = bytearray(48)
    header[:10] = b"foxfpk\x00win"
    struct.pack_into("<I", header, 10, offset + len(payload))
    struct.pack_into("<4I", header, 32, 2, 1, 0, 0)
    return bytes(header) + struct.pack("<4Q16s", offset, len(payload), 96, len(name), hashlib.md5(name).digest()) + name + payload


class InspectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def inspect(self, data, name="sample.bin"):
        path = self.root / name
        path.write_bytes(data)
        before = path.read_bytes()
        report = inspect_file(path)
        self.assertEqual(path.read_bytes(), before)
        self.assertTrue(report["source_unchanged"])
        json.dumps(report, allow_nan=False)
        return report

    def test_bounded_reader(self):
        reader = Reader(io.BytesIO(b"1234"), 4, budget=3)
        for offset, length in [(-1, 1), (3, 2), (2**64, 1)]:
            with self.assertRaises(InspectionError): reader.read(offset, length)
        self.assertEqual(reader.read(0, 3), b"123")
        with self.assertRaises(InspectionError): reader.read(3, 1)

    def test_fpk_and_staging_hashes_no_overwrite(self):
        report = self.inspect(container(), "face.fpk")
        self.assertEqual(report["format"], "FPK")
        self.assertTrue(report["entries"][0]["filename_md5_match"])
        output = self.root / "experiment"
        output.mkdir()
        staged = stage_entry(self.root / "face.fpk", 0, output)
        self.assertEqual(Path(staged["output"]).read_bytes(), b"FMDLtest")
        self.assertEqual(staged["source_range_sha256"], staged["output_sha256"])
        with self.assertRaises(InspectionError): stage_entry(self.root / "face.fpk", 0, output)
        with self.assertRaises(InspectionError): stage_entry(self.root / "face.fpk", -1, output)
        with self.assertRaises(InspectionError): stage_entry(self.root / "face.fpk", 1, output)

    def test_path_policy(self):
        for name in ["../escape", "/absolute", "C:/drive", "a\\b", "CON", "x/NUL.txt", "a//b", "name.", "a\x00b"]:
            self.assertFalse(safe_member_name(name), name)
        self.assertTrue(safe_member_name("face/model.fmdl"))
        result = self.inspect(container(b"../escape"), "unsafe.fpk")
        self.assertEqual(result["status"], "metadata_warnings")
        with self.assertRaises(InspectionError): stage_entry(self.root / "unsafe.fpk", 0, self.root)

    def test_fpk_truncated_and_oob_and_bad_md5(self):
        self.assertEqual(self.inspect(b"foxfpk")['status'], 'rejected_structure')
        data = bytearray(container())
        struct.pack_into("<Q", data, 48, 2**63)
        self.assertFalse(self.inspect(data)["entries"][0]["payload_in_bounds"])
        data = bytearray(container()); data[80] ^= 1
        self.assertFalse(self.inspect(data)["entries"][0]["filename_md5_match"])

    def test_fmdl_descriptors_and_length_warning(self):
        header = struct.pack("<4sIQ2Q6I", b"FMDL", 0x4001EB85, 64, 1, 8, 1, 1, 84, 0, 84, 4)
        data = header + b"\0"*8 + struct.pack("<HHI", 0, 0, 0) + struct.pack("<III", 3, 0, 4) + b"abc\0"
        r = self.inspect(data)
        self.assertEqual(r["status"], "metadata_inspected")
        self.assertFalse(r["mesh_uv_material_skeleton_weights_decoded"])
        data = bytearray(data); struct.pack_into("<I", data, 80, 99999)
        self.assertEqual(self.inspect(data)["status"], "metadata_warnings")
        data = bytearray(data); struct.pack_into("<I", data, 32, 2**32-1)
        self.assertEqual(self.inspect(data)["status"], "rejected_structure")

    def test_ftex_frame_range_no_decompression(self):
        header = bytearray(64); header[:4] = b"FTEX"
        struct.pack_into("<f4H", header, 4, 2.03, 4, 4, 4, 1); header[16] = 1
        data = bytes(header) + struct.pack("<3IBBH", 80, 16, 0, 0, 0, 0) + b"\0"*16
        r = self.inspect(data)
        self.assertEqual(r["format"], "FTEX"); self.assertFalse(r["texture_decoded"])
        self.assertTrue(r["frames"][0]["payload_ranges_in_bounds"])
        self.assertEqual(self.inspect(data[:-1])["status"], "metadata_warnings")
        self.assertEqual(self.inspect(data[:70])["status"], "rejected_structure")

    def test_face_and_filename_not_proof(self):
        r = self.inspect(b"FACE" + b"\0"*956, "face_diff.bin")
        self.assertEqual(len(r["raw_triplets"]), 4)
        self.assertFalse(r["schema_verified"])
        self.assertEqual(self.inspect(b"not a PES file", "other.bin")["format"], "unknown")
        self.assertEqual(self.inspect(b"fake", "face_diff.bin")["format"], "unknown")

    def test_directory_is_not_scanned(self):
        with self.assertRaises(InspectionError): inspect_file(self.root)

    def test_unknown_empty_and_nonfinite_are_json_safe(self):
        self.assertEqual(self.inspect(b"")["format"], "unknown")
        self.assertEqual(self.inspect(b"FMDL")["status"], "rejected_structure")
        data = bytearray(b"FACE" + b"\0"*956); struct.pack_into("<f", data, 8, float('nan'))
        self.assertIsNone(self.inspect(data)["raw_triplets"][0]["float32_le"][0])


if __name__ == "__main__":
    unittest.main()

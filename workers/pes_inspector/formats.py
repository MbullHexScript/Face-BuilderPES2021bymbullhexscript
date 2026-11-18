"""Header/table layouts from cited research; no geometry decoding or PES writer."""
import hashlib
import math
import re
import struct
from pathlib import PurePosixPath
from .binary import InspectionError

MAX_ENTRIES = 4096


def safe_member_name(name):
    parts = name.split("/")
    return bool(name) and not PurePosixPath(name).is_absolute() and not any(
        p in ("", ".", "..") or p.endswith((".", " ")) or
        re.search(r'[\\:<>"|?*\x00-\x1f]', p) or
        re.fullmatch(r"(?i)(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?", p)
        for p in parts
    )


def fpk(reader, issues):
    header = reader.read(0, 48)
    kind, platform = header[6], header[7:10]
    declared = struct.unpack_from("<I", header, 10)[0]
    flag, count, references, tail = struct.unpack_from("<4I", header, 32)
    if count > MAX_ENTRIES or references > MAX_ENTRIES:
        raise InspectionError("Jumlah entry/reference melampaui batas inspector")
    if platform != b"win" or kind not in (0, 100) or flag != 2 or tail != 0:
        raise InspectionError("Varian header FPK belum didukung")
    table_end = 48 + count * 48 + references * 16
    if not reader.contains(48, table_end - 48):
        raise InspectionError("Tabel FPK terpotong")
    if declared != reader.size:
        issues.append("Ukuran deklarasi FPK berbeda dari ukuran file")
    if references:
        issues.append("Reference records ada; resolusi dependensi belum diimplementasikan")
    entries, names = [], set()
    for i in range(count):
        descriptor_offset = 48 + i * 48
        offset, length, name_offset, name_length, digest = struct.unpack("<4Q16s", reader.read(descriptor_offset, 48))
        if name_length > 4096:
            raise InspectionError("Nama entry terlalu panjang")
        raw = reader.read(name_offset, name_length)
        try:
            name = raw.decode("utf-8")
        except UnicodeDecodeError:
            name = None
        bounded = reader.contains(offset, length)
        safe = name is not None and safe_member_name(name)
        md5_match = hashlib.md5(raw).digest() == digest
        if not bounded:
            issues.append(f"Entry {i}: range payload di luar file")
        if name in names:
            issues.append(f"Entry {i}: nama duplikat")
        names.add(name)
        if not safe:
            issues.append(f"Entry {i}: nama tidak aman/tidak terdekode; tidak boleh diekstrak")
        if not md5_match:
            issues.append(f"Entry {i}: MD5 nama tidak cocok; kemungkinan varian nama unresolved/encrypted, bukan validasi CRC payload")
        if offset < table_end or name_offset < table_end:
            issues.append(f"Entry {i}: range bertumpang tindih dengan tabel")
        entries.append({"index": i, "descriptor_offset": descriptor_offset, "name": name,
                        "name_offset": name_offset, "name_length": name_length,
                        "name_bytes_hex": raw.hex(), "filename_md5_stored": digest.hex(),
                        "filename_md5_match": md5_match, "safe_path": safe,
                        "payload_offset": offset, "payload_length": length,
                        "payload_in_bounds": bounded,
                        "prefix_hex": reader.read(offset, min(16, length)).hex() if bounded else None})
    return {"format": "FPKD" if kind == 100 else "FPK", "declared_size": declared,
            "file_count": count, "reference_count": references, "table_end": table_end, "entries": entries}


def fmdl(reader, issues):
    values = struct.unpack("<4sIQ2Q6I", reader.read(0, 56))
    _, version, table, bitmap0, bitmap1, count0, count1, start0, size0, start1, size1 = values
    if count0 + count1 > MAX_ENTRIES:
        raise InspectionError("Jumlah descriptor FMDL melampaui batas")
    if table < 56 or not reader.contains(table, count0 * 8 + count1 * 12):
        raise InspectionError("Range descriptor FMDL tidak valid")
    for index, start, length in [(0, start0, size0), (1, start1, size1)]:
        if not reader.contains(start, length):
            issues.append(f"Section {index}: panjang deklarasi di luar file; bukan bukti tunggal file tidak kompatibel")
    if version != 0x4001EB85:
        issues.append("Versi FMDL berbeda dari bit-pattern 2.03 pada referensi")
    blocks, seen = [], [set(), set()]
    for section, count, stride, origin, base in [(0, count0, 8, table, start0), (1, count1, 12, table + count0 * 8, start1)]:
        for i in range(count):
            descriptor = origin + i * stride
            values = struct.unpack("<HHI" if section == 0 else "<III", reader.read(descriptor, stride))
            block_id, second, third = values
            relative, length = (third, None) if section == 0 else (second, third)
            absolute = base + relative
            if block_id in seen[section]:
                issues.append(f"Section {section}: descriptor ID {block_id} duplikat")
            seen[section].add(block_id)
            bounded = reader.contains(absolute, length or 0)
            if not bounded:
                issues.append(f"Section {section} block {block_id}: range deklarasi di luar file")
            blocks.append({"section": section, "id": block_id, "descriptor_offset": descriptor,
                           "relative_offset": relative, "absolute_offset": absolute,
                           "record_count": second if section == 0 else None,
                           "declared_length": length, "declared_range_in_bounds": bounded,
                           "record_width_verified": False if section == 0 else None})
    strings = []
    for block in blocks:
        if block["section"] == 1 and block["id"] == 3 and block["declared_range_in_bounds"]:
            length = min(block["declared_length"], 256 * 1024)
            raw = reader.read(block["absolute_offset"], length)
            for match in list(re.finditer(rb"[\x20-\x7e]{4,256}", raw))[:512]:
                strings.append({"offset": block["absolute_offset"] + match.start(), "text": match.group().decode("ascii")})
            if length < block["declared_length"]:
                issues.append("String preview dibatasi 256 KiB")
    return {"format": "FMDL", "version_bits": f"0x{version:08X}", "version_float": struct.unpack("<f", struct.pack("<I", version))[0] if math.isfinite(struct.unpack("<f", struct.pack("<I", version))[0]) else None,
            "descriptor_table_offset": table, "section_bitmaps": [f"0x{bitmap0:X}", f"0x{bitmap1:X}"],
            "sections": [{"offset": start0, "declared_length": size0}, {"offset": start1, "declared_length": size1}],
            "blocks": blocks, "printable_strings_section1_block3": strings, "mesh_uv_material_skeleton_weights_decoded": False}


def ftex(reader, issues):
    header = reader.read(0, 64)
    version = struct.unpack_from("<f", header, 4)[0]
    pixel, width, height, depth = struct.unpack_from("<4H", header, 8)
    mipmaps, nrt = header[16:18]
    texture_type = struct.unpack_from("<I", header, 28)[0]
    companions = header[32]
    if not math.isfinite(version) or not 2.025 <= version <= 2.045:
        issues.append("Versi FTEX di luar rentang referensi 2.025..2.045")
    if not width or not height or not mipmaps:
        raise InspectionError("Dimensi/mipmap FTEX nol")
    frames = 6 * mipmaps if texture_type & 4 else mipmaps
    if not reader.contains(64, frames * 16):
        raise InspectionError("Tabel frame FTEX terpotong")
    if companions:
        issues.append("FTEX memerlukan companion FTEXS; payload eksternal tidak diperiksa")
    records = []
    for i in range(frames):
        table = 64 + i * 16
        offset, unpacked, packed, mip, companion, chunks = struct.unpack("<3IBBH", reader.read(table, 16))
        ranges = []
        if mip != i % mipmaps:
            issues.append(f"Frame {i}: indeks mip tidak sesuai urutan referensi")
        if companion:
            bounded = None
        elif chunks:
            bounded = reader.contains(offset, chunks * 8)
            if not bounded:
                issues.append(f"Frame {i}: tabel chunk di luar file")
            else:
                for j in range(chunks):
                    packed_chunk, raw_chunk, tagged = struct.unpack("<HHI", reader.read(offset + j * 8, 8))
                    absolute = offset + (tagged & 0x7FFFFFFF)
                    valid = reader.contains(absolute, packed_chunk)
                    bounded = bounded and valid
                    ranges.append({"offset": absolute, "stored_size": packed_chunk, "declared_decoded_size": raw_chunk, "compression_flag": not bool(tagged & 0x80000000), "in_bounds": valid})
        else:
            bounded = reader.contains(offset, packed or unpacked)
        if bounded is False:
            issues.append(f"Frame {i}: range payload di luar file")
        records.append({"table_offset": table, "payload_offset": offset, "declared_uncompressed_size": unpacked,
                        "declared_compressed_size": packed, "mip_index": mip, "companion_index": companion,
                        "chunk_count": chunks, "payload_ranges_in_bounds": bounded, "chunks": ranges})
    return {"format": "FTEX", "version": version if math.isfinite(version) else None,
            "pixel_format_code": pixel, "width": width, "height": height, "depth": depth,
            "mipmap_count": mipmaps, "nrt_raw": nrt, "texture_type_bits": texture_type,
            "ftexs_count": companions, "frames": records, "texture_decoded": False}


def face(reader, issues):
    records = []
    for offset in [0x08, 0x3C, 0x150, 0x160]:
        if reader.contains(offset, 12):
            raw = reader.read(offset, 12)
            values = struct.unpack("<3f", raw)
            records.append({"offset": offset, "hex": raw.hex(), "float32_le": [x if math.isfinite(x) else None for x in values]})
    issues.append("FACE signature + raw triplets saja; semantik mata/mulut dan kompatibilitas game belum divalidasi")
    return {"format": "FACE", "raw_triplets": records, "schema_verified": False}

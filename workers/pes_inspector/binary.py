"""Bounded reads and source integrity primitives; source files are always rb."""
import hashlib

CHUNK = 1024 * 1024


class InspectionError(ValueError):
    pass


class Reader:
    def __init__(self, stream, size, budget=8 * CHUNK):
        self.stream, self.size, self.budget = stream, size, budget
        self.bytes_read = 0

    def contains(self, offset, length):
        return 0 <= offset <= self.size and 0 <= length <= self.size - offset

    def read(self, offset, length):
        if not self.contains(offset, length):
            raise InspectionError(f"Range di luar file: offset=0x{offset:X}, length={length}, size={self.size}")
        if length > CHUNK or self.bytes_read + length > self.budget:
            raise InspectionError("Batas pembacaan metadata terlampaui")
        self.stream.seek(offset)
        result = self.stream.read(length)
        if len(result) != length:
            raise InspectionError("File terpotong/berubah saat dibaca")
        self.bytes_read += length
        return result


def stream_sha256(stream, size):
    reader = Reader(stream, size, budget=size)
    digest = hashlib.sha256()
    offset = 0
    while offset < size:
        block = reader.read(offset, min(CHUNK, size - offset))
        digest.update(block)
        offset += len(block)
    return digest.hexdigest()

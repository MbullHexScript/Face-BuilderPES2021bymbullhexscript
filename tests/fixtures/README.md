# Sampel pengujian asli

`generate.py` menghasilkan mesh kotak, tekstur checker PNG 8×8, dan GLB secara prosedural dengan Python standard library. Tidak ada model atau gambar eksternal. Fixture dan generator ini didedikasikan ke domain publik (CC0-1.0).

- `calibration.glb`: satu mesh bertekstur, translasi (2, 1, -1), skala (1, 1.5, 0.75).
- `large-transformed.glb`: mesh yang sama, translasi (200, 100, -50), skala (10, 30, 20).
- `external-resource.glb`: sengaja tidak mandiri; harus ditolak sebelum permintaan URL.
- `broken-texture.glb`: PNG embedded sengaja rusak; harus ditolak, bukan dilaporkan berhasil tanpa tekstur.

Ini objek kalibrasi, bukan wajah pemain dan bukan bukti kompatibilitas PES. Jalankan ulang dengan `python tests/fixtures/generate.py`.

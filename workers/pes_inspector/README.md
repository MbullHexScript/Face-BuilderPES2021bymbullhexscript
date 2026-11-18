# PES Asset Inspector

Implementasi mandiri Python standard library, bukan salinan parser komunitas. Layout header diperiksa terhadap sumber yang dicantumkan dalam `docs/pes-format-research.md`.

```powershell
python -m workers.pes_inspector "path/to/file.fpk"
python -m unittest discover -s tests -p test_pes_inspector.py -v
```

Input harus file eksplisit. CLI tidak memindai direktori, tidak mengubah sumber, dan hanya menulis JSON ke stdout. Hash sebelum/sesudah memakai blok maksimum 1 MiB. Pembacaan metadata dibatasi 8 MiB; tabel FPK/FMDL dibatasi 4096 entry. Hasil metadata tidak membuktikan file diterima game.

`staging.py` adalah helper terpisah yang menulis satu range FPK ke direktori eksperimen yang diberikan caller. Helper memerlukan container tanpa warning, nama aman, MD5 nama cocok, range valid, dan ukuran entry maksimum 64 MiB. Output menggunakan `xb`; tidak boleh overwrite. Jika I/O gagal setelah output dibuat, partial tetap berada di direktori eksperimen dan tidak dinyatakan valid. Tidak ada resume otomatis.

Caller `tools/task03_sample.py` membatasi input ke salinan pemain 100112, tiga entry allowlist, dan direktori run baru di `analysis/task03`. Tidak ada repacking. Batas concurrency: hash mendeteksi perubahan biasa, tetapi tidak mengunci file terhadap writer eksternal atau serangan race yang sengaja mengembalikan isi semula.

FPK metadata, FMDL descriptors/string preview, FTEX frame/chunk ranges, dan FACE raw triplets sudah diuji pada satu sampel lokal. Geometry, UV, rigging, skin weights, material graph, decompression, import Blender, export PES, dan round-trip belum diimplementasikan.

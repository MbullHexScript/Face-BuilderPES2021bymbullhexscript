# TASK 03 — PES Face Compatibility Research & Prototype

Tanggal: 14 November 2026. Project: `D:\Projectku\Face-Builder`.

## Hasil

Fondasi inspector read-only dan staging FPK terbatas berhasil diuji pada salinan satu face LiveCPK pemain ber-ID folder `100112`. Belum ada keberhasilan import geometri, export PES, round-trip, atau pengujian dalam game yang dapat diklaim.

Sumber awal project tidak berisi sampel PES. Setelah pengguna mengizinkan pemeriksaan Sider, satu folder pemain disalin lengkap: 20 file, 8.592.640 byte. Hash sumber dan salinan cocok sebelum/sesudah eksperimen. Aset pihak ketiga dan hasil turunannya dikecualikan dari Git. Tidak ada perubahan pada instalasi game atau Blender.

## Implementasi

- `workers/pes_inspector/binary.py`: bounded reads, batas metadata, SHA-256 streaming.
- `formats.py`: metadata FPK/FPKD, FMDL, FTEX dan signature FACE; path policy.
- `inspector.py` dan `__main__.py`: input file eksplisit, JSON, deteksi perubahan sumber. Tidak menerima pencarian direktori otomatis.
- `staging.py`: penyalinan satu payload FPK tervalidasi, batas 64 MiB, create-exclusive, verifikasi hash.
- `tools/task03_sample.py`: eksperimen khusus sampel `100112`, tiga nama entry allowlist, output run baru.
- `tests/test_pes_inspector.py`: sembilan test sintetik untuk bounds, header, path traversal, checksum nama, no-overwrite, staging, unknown format, nonfinite floats, dan larangan scan direktori.
- `src/features/pes-compatibility/contracts.ts`: kontrak import/export/validation dan status kapabilitas; tidak ada implementasi konversi palsu.
- `workers/blender/protocol.md`: interface worker terisolasi; belum ada executor.

Tidak ada dependency baru, tombol ekspor, atau perubahan perilaku viewport TASK 02.

## Status modul

| Modul                    | Status                                                                          |
| ------------------------ | ------------------------------------------------------------------------------- |
| PES Asset Inspector      | Eksperimental; metadata nyata terverifikasi pada satu sampel                    |
| FPK staging              | Berfungsi untuk entry yang lolos pemeriksaan; bukan repacker/exporter           |
| Asset Validation         | Bounds, hash, path, sebagian konsistensi metadata; belum validasi semantik game |
| PES Import Adapter       | Kontrak saja; belum diimplementasikan                                           |
| PES Export Adapter       | Kontrak saja; belum diimplementasikan                                           |
| Blender Worker Interface | Dokumen protokol saja; belum mengeksekusi Blender                               |

## Temuan penting

Sampel mengandung `face_high.fmdl`, `hair_high.fmdl`, `face_diff.bin`, 18 FTEX dan FPKD kosong. `oral.fmdl` tidak ditemukan walaupun tekstur oral ada. Beberapa referensi common texture tidak tersedia dalam folder pemain. Karena itu, kelengkapan folder tidak sama dengan bundle material mandiri.

Field header dan tabel dapat dibaca. Namun mesh, UV, material graph, skeleton, rigging, dan skin weights belum didekode. Inspector tidak melabeli file yang lolos bounds sebagai kompatibel dengan game. Panjang section FMDL yang menyimpang dilaporkan tanpa otomatis menyimpulkan file PES rusak, karena parser referensi sendiri memiliki toleransi terhadap beberapa deklarasi panjang.

MD5 FPK diperiksa terhadap nama entry; jangan menganggapnya checksum payload. Integritas payload staging dibuktikan terpisah melalui SHA-256.

## Verifikasi

- Sembilan test Python inspector lulus.
- TypeScript typecheck, frontend build, dan delapan automated test regresi TASK 02 dijalankan; hasil akhir dicatat dalam log TASK 03.
- Seluruh 20 file sumber dan salinan tetap sama pada pemeriksaan integritas akhir.
- Tidak ada round-trip yang dijalankan. Startup native tidak diulang karena host/UI TASK 02 tidak berubah; bukti native TASK 02 tetap merupakan pengujian tahap sebelumnya.

Log: `docs/task-03-inspector-tests.log`, `docs/task-03-typecheck.log`, `docs/task-03-build.log`, `docs/task-03-regression.log`. Peringatan bundle besar dan deprecated `THREE.Clock` dari TASK 02 bukan klaim telah diperbaiki pada tahap ini.

## Cara menggunakan

Jalankan dari root project:

```powershell
python -m workers.pes_inspector "tests/fixtures/pes-face-local/100112/#Win/face.fpk"
python -m unittest discover -s tests -p test_pes_inspector.py -v
python -m tools.task03_sample
```

Inspector mencetak JSON ke stdout dan tidak menulis aset. Script sampel membuat folder run baru di `analysis/task03/`; script tidak mencari file dari instalasi game. Folder fixture lokal tidak didistribusikan dalam repository.

## Batas dan langkah berikutnya

Prototype yang terbukti saat ini adalah **inspeksi metadata dan staging byte-identik**, bukan importer/exporter wajah. Konversi ditunda sampai dependency material dan jalur adapter berlisensi jelas serta kompatibel dengan Blender terisolasi dapat diverifikasi. Jangan memasang fork hanya karena README mengklaim Blender modern atau round-trip.

Lanjutkan setelah review dengan satu adapter yang lolos audit, satu runtime Blender terpisah, dan baseline per-atribut sebelum/sesudah konversi. Tidak ada AI Engine, Hair Generator, atau TASK 04 yang dikerjakan.

Dokumen pendamping: [riset format dan tooling](pes-format-research.md), [bukti pipeline dan batas validasi](pes-pipeline-validation.md).

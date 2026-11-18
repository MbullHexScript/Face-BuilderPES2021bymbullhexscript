# PES 2021 Face Studio

TASK 03 menambahkan inspector metadata PES read-only dan staging FPK terbatas. Import geometri PES, ekspor, serta round-trip belum tersedia. Lihat [laporan TASK 03](docs/task-03.md), [audit format/tooling](docs/pes-format-research.md), dan [bukti pipeline](docs/pes-pipeline-validation.md). Viewport GLB TASK 02 tetap berfungsi.

Fondasi aplikasi desktop Windows untuk wajah dan rambut pemain PES 2021. Status: TASK 02. Viewport WebGL, impor GLB lokal, orbit/zoom/pan, preset kamera, dan mode Solid/Wireframe/Textured tersedia. AI, mesh editing, pembuatan proyek, ekspor, dan pemrosesan game belum tersedia.

## Menjalankan

Root project: `D:\Projectku\Face-Builder` (tidak ada subproject bersarang).

```powershell
cd D:\Projectku\Face-Builder
npm ci
npm run desktop:dev
```

Prasyarat: Node.js yang memenuhi engines Vite, Rust stable MSVC, Visual Studio C++ Build Tools beserta Windows SDK, dan WebView2. Python/Blender belum diperlukan untuk menjalankan versi ini. Blender tidak diperlukan pada tahap ini.

```powershell
npm run dev             # frontend browser, http://127.0.0.1:1420
npm run typecheck       # TypeScript UI dan konfigurasi
npm run build           # frontend produksi
npm test                # smoke test menggunakan Microsoft Edge lokal
npm run desktop:build   # executable desktop; tanpa installer
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml --locked
```

Gunakan hanya satu perintah development pada satu waktu karena port 1420 bersifat strict. Hentikan dengan Ctrl+C. `npm run desktop:dev` menjalankan Vite secara otomatis. Untuk menjalankan test bersamaan, server Vite lokal dapat digunakan kembali.

## Struktur

```text
src/
  app/                        Shell, navigasi, tema
  features/studio/             Tampilan ruang kerja awal
  features/ai-engine/          Batas modul; belum diimplementasikan
  features/viewport/           Canvas, impor GLB, kamera, lifecycle GPU
  features/pes-compatibility/  Batas modul; belum diimplementasikan
  shared/                     Tempat komponen bersama
src-tauri/                    Host desktop Rust, konfigurasi, capabilities
workers/blender/              Tempat worker Python mendatang
assets/                       Aset sumber
tests/                        Test antarmuka, GLB, kamera, material, dan native smoke
docs/                         Arsitektur dan laporan verifikasi
```

`node_modules`, `dist`, `src-tauri/target`, `test-results` adalah hasil instalasi/build dan diabaikan Git. Commit `package-lock.json` dan `src-tauri/Cargo.lock` agar resolusi dependensi dapat diulang. Jangan commit kredensial atau model AI.

Lihat [arsitektur](docs/architecture.md) dan [laporan TASK 01](docs/task-01.md).

## Viewport TASK 02

Klik **Import 3D Model** untuk memilih GLB mandiri, maksimum 64 MiB. Drag kiri untuk orbit, scroll untuk zoom, dan drag kanan untuk pan. Front = pandangan dari +Z, Left = -X, Right = +X, Back = -Z. Reset memulihkan framing diagonal. Tombol arah dan resize melakukan framing ulang; transformasi model tidak berubah.

Textured menggunakan material asli, Solid memakai material studio tanpa tekstur, Wireframe menampilkan tepi segitiga. Data model hanya disimpan selama halaman Ruang kerja aktif; pindah ke Tentang atau menutup aplikasi membuang model dari memori. Belum ada penyimpanan proyek.

Sampel asli untuk mencoba impor: `tests/fixtures/calibration.glb`. GLB bereferensi eksternal, Draco, Meshopt, dan KTX2 belum didukung. Animasi tidak dimainkan. Lihat [laporan TASK 02](docs/task-02.md).

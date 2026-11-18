# Arsitektur (catatan historis TASK 01)

## Batas implementasi

React menangani navigasi lokal dan UI; Tauri/Rust menjadi host Windows. Belum ada custom IPC command, akses filesystem, shell plugin, pemanggilan model AI, atau eksekusi Blender. Capabilities tidak memberikan izin tambahan. CSP produksi membatasi sumber aset dan koneksi ke origin sendiri serta IPC Tauri. Izin baru harus ditambahkan sesuai fitur yang benar-benar dibutuhkan.

Three.js dan React Three Fiber terpasang untuk stack yang disepakati tetapi tidak diimpor ke runtime. Ilustrasi wajah adalah SVG statis dan diberi label; bukan editor atau hasil generasi AI. Dua engine diberi nama netral A/B karena provider belum ditentukan.

## Arah dependensi mendatang (belum dibuat)

UI fitur → kontrak layanan → command Tauri → adapter provider/worker. Worker Blender dipisahkan dari UI dan lifecycle aplikasi; protokol pekerjaan, timeout, pembatalan, logging, serta isolasi output harus dirancang sebelum implementasi. PES Compatibility Engine kelak memvalidasi aset berdasarkan bukti format, bukan menulis langsung ke instalasi game.

Jangan tambahkan API key di bundle Vite. Folder modul berisi README batas tanggung jawab, bukan fungsi stub yang berpura-pura berhasil. Tidak ada dependency Python atau perubahan pada instalasi Blender.

## Keputusan visual

Tema Dark Studio: base `#17191e`, sidebar `#1c1e24`, panel `#21242b`, border `#30343d`, teks `#e7eaf0`, aksen `#93b9f4`. Font lokal Segoe UI Variable/Segoe UI, tanpa download font. Navigasi kiri, ruang kerja tengah, status modul kanan; heading rata kiri, empty state terpusat. Ilustrasi wajah menjadi fokus visual tunggal, tanpa dashboard metrik atau kontrol editor palsu. Layout menyusut ke satu kolom pada viewport sempit; fokus keyboard terlihat dan reduced motion dihormati.

## Referensi resmi

- [Inisialisasi Tauri 2](https://v2.tauri.app/start/create-project/)
- [Prasyarat Windows](https://v2.tauri.app/start/prerequisites/)

Berhenti di TASK 01. Kontrak Dual AI Engine, format proyek, dan strategi kompatibilitas harus ditentukan pada instruksi berikutnya sebelum membuat fitur.

## Perubahan TASK 02

`src/features/viewport` sekarang aktif: `Viewport.tsx` mengelola file picker/state/error boundary, `model.ts` menangani validasi GLB dan ownership resource, `camera.ts` menghitung framing, `Scene.tsx` merender dengan R3F dan OrbitControls. Tidak ada backend command atau izin filesystem baru. Loader memakai File API dan ArrayBuffer; resource eksternal ditolak sebelum parsing. CSP mengizinkan blob/data lokal untuk tekstur embedded.

Material asli disimpan untuk Textured; material Solid/Wireframe dibuat terpisah. Geometri, material, tekstur, bitmap, dan skeleton yang dimiliki model dibersihkan ketika diganti/dilepas. Impor asinkron yang sudah kedaluwarsa dibuang dan tidak mengubah state. Berkas invalid tidak menggantikan model aktif. Grid dan kamera memakai world bounds; node/model tidak di-center atau di-rescale.

Rendering demand-based: input OrbitControls memicu render, tanpa loop GPU terus-menerus saat idle. Context loss mempunyai error yang terlihat dan jalur reload renderer. Tidak ada mixer animasi, sculpting, AI, atau ekspor PES.

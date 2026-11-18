# Blender Worker Interface — kontrak, belum ada executor

Worker nanti berjalan pada proses terpisah, `blender --background --factory-startup`, menggunakan direktori sementara per job. Jangan menggunakan Blender interaktif utama atau memasang addon ke profil pengguna. Kontrak ini tidak menjalankan command apa pun.

Request versi 1 wajib membawa `jobId`, operasi (`import_preview` / `export_candidate`), identitas sumber (path, ukuran, SHA-256), path executable Blender yang sudah disetujui, commit/hash adapter dan lisensinya, serta direktori output eksperimen yang baru dan kosong. Tidak menerima command string arbitrer.

Response wajib: status eksplisit (`success`, `failed`, `cancelled`, `unsupported`), daftar output beserta SHA-256, versi Blender/adapter, log, perubahan atribut, kehilangan data, dan validation report. `success` berarti operasi menghasilkan output yang memenuhi pemeriksaan struktural yang disebutkan; tidak berarti kompatibel dengan game.

Controller harus memvalidasi bounds/path, melarang overwrite sumber dan instalasi game, menetapkan timeout/cancellation, menutup proses anak, serta memverifikasi hash input sebelum/sesudah. Jangan meneruskan secret ke worker. Untuk round-trip, bandingkan topology/index order, UV tiap channel/seam, normals/tangents/handedness, material IDs/parameters/samplers, bone hierarchy/IDs/transforms, bone groups/weights, bounds/LOD, dan metadata yang tidak direpresentasikan GLB.

Status TASK 03: kontrak saja. Belum ada proses Blender, importer, exporter, atau handshake yang dijalankan.

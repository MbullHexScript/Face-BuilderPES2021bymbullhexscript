# Validasi pipeline PES — TASK 03

Tanggal laporan: 14 November 2026. Bukti ini berlaku untuk satu sampel lokal, bukan seluruh aset PES 2021.

## Sumber dan izin

Pengguna secara eksplisit mengizinkan membaca `sider.ini`, mencari satu face LiveCPK aktif, dan menyalinnya. Konfigurasi ditemukan di `D:\Games-kuyhAa\eFootball PES 2021\sider\sider.ini`; kandidat `sider.ini` langsung di root instalasi tidak ditemukan. Konfigurasi berisi `livecpk.enabled = 1` dan root `Faces`, `t99p21_facepack_25_VOL1`, serta `t99p21_facepack_25_VOL2`. Ini bukti konfigurasi, bukan bukti game sedang memuat file tertentu.

Folder terpilih:

```text
D:\Games-kuyhAa\eFootball PES 2021\sider\livecpk\Faces\asset\model\character\face\real\100112
```

Seluruh 20 file, total 8.592.640 byte, disalin ke `tests/fixtures/pes-face-local/100112/`. ID folder tidak dipetakan ke nama pemain. Sumber dibuka `rb`, salinan dibuat `xb`, dan SHA-256 sumber sebelum/sesudah cocok dengan salinan. Pemeriksaan akhir terhadap 20 sumber dan 20 salinan juga cocok.

Manifest lokal: `analysis/task03/copy-manifest.json` dan `analysis/task03/final-integrity.json`. Kedua folder `tests/fixtures/pes-face-local/` dan `analysis/task03/` masuk `.gitignore`. Project belum merupakan repository Git saat diperiksa; tidak ada commit atau upload aset yang dilakukan.

## Inventaris dan staging yang terbukti

`face.fpk`: 550.864 byte, signature `foxfpk`, type 0, platform `win`, tiga entry. `face.fpkd`: 48 byte, type ASCII `d`, nol entry. MD5 di entry cocok dengan **byte nama file**, bukan checksum payload.

| Entry            | Offset absolut FPK | Ukuran | SHA-256 range dan hasil staging                                    |
| ---------------- | ------------------ | ------ | ------------------------------------------------------------------ |
| `face_diff.bin`  | `0xF0`             | 960    | `db8dc1ba2c49bca6b647a20f7cf87833fe400182ae920eb5fd09921d63dd80fa` |
| `face_high.fmdl` | `0x4B0`            | 448056 | `5a48a1aeef89eade685f53fc41634d7da64e5d0d5f79f1b47a4cdb794e80f533` |
| `hair_high.fmdl` | `0x6DAF0`          | 101594 | `e5489f51772bea3402e473782e150751a0e9c4a80f0a23c01f7e7bd2e4c27a5c` |

Ketiga entry disalin dari **FPK salinan**, bukan diekspor ulang. Range diperiksa sebelum dibaca, hash container diperiksa sebelum/sesudah, dan hasil dibandingkan dengan hash byte range. Nama output diberi indeks. File yang sudah ada ditolak. Tidak ada penulisan FPK/FPKD baru.

Run bukti terbaru: `analysis/task03/run-f378e1e47a16/inspection.json`. Run awal `run-c62593a1a7ea` dipertahankan. Masing-masing run memiliki output terpisah; fixture sumber tidak ditimpa.

## Metadata aktual

Kedua FMDL memiliki bit versi `0x4001EB85` (float sekitar 2.03), descriptor table di `0x40`, 19 descriptor section 0 dan empat section 1. Inspector membaca header, offset, count, panjang deklarasi, dan printable strings section 1 block 3. Lebar record section 0 dan graph mesh/UV/material/bone belum divalidasi. Count block 0 adalah 49 pada face dan 142 pada hair; angka tersebut tidak dipakai untuk mengklaim rig telah berhasil diimpor.

`face_diff.bin` memiliki signature `FACE`. Byte triplet yang dibaca:

| Offset  | Byte hex                   |
| ------- | -------------------------- |
| `0x08`  | `cdcc8c3fcdcc8c3fcdcc8c3f` |
| `0x3C`  | `d70f3839259fdc3d61e19cbd` |
| `0x150` | `cf85da3b9290f0bae2a8b93a` |
| `0x160` | `1b340f3ce7f008bbb42d5abb` |

Float little-endian dicatat dalam JSON. Semantik mata/mulut belum dikonfirmasi lewat Blender atau game; status sengaja `metadata_warnings`.

18 FTEX lolos pemeriksaan header, frame/chunk table, dan range dalam file. Tidak ada FTEXS yang diperlukan menurut header sampel. `arm_bsm.ftex` memakai pixel-format code 4; 17 lainnya code 11. Rentang resolusi dari 128×64 sampai 2048×1024, mipmap count 7 sampai 12. Kode tersebut lazim dipetakan ke BC3/BC7 pada source referensi; inspector sendiri tidak mendekompresi atau merendernya.

## Kelengkapan yang belum terbukti

Tidak ditemukan `oral.fmdl` dalam folder maupun daftar isi FPK sampel. Ada `oral_bsm`, `oral_nrm`, `oral_srm`, dan `oral_trm` sebagai FTEX. Printable strings pada `face_high.fmdl` juga menyebut tekstur oral. Ini bukti referensi nama, bukan bukti struktur mesh oral tertentu.

Nama resource di string pool memakai `.dds`/`.tga`, sedangkan file lokal memakai `.ftex`. Penggantian ekstensi saja belum membuktikan resolusi resource/material.

Referensi berikut tidak mempunyai padanan basename lokal:

- `haircube_cbm.dds`, ditemukan pada face (`0x6D2AF`) dan hair (`0x18B83`).
- `head_wet_cbm.dds`, ditemukan pada face (`0x6D490`).
- `face_eyelash_nrm.tga` (`0x6D405`) dan `face_eyelash_srm.tga` (`0x6D41A`).

String `/Assets/pes16/model/character/common/sourceimages/` ada pada face (`0x6D2C0`) dan hair (`0x18B94`). Direktori padanan `asset/model/character/common/sourceimages` diperiksa secara spesifik pada tiga root LiveCPK face aktif dan tidak ditemukan. Lokasi lain, archive game, dan fallback resolver belum diperiksa. Folder pemain sudah disalin lengkap, tetapi **bundle material mandiri belum lengkap/terbukti**.

## Matriks hasil, tanpa menyamakan staging dengan konversi

| Tahap                                  | Hasil                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| Identifikasi FPK/FPKD                  | Teruji pada sampel asli yang disalin                           |
| Staging tiga payload FPK               | Berhasil, byte-identik                                         |
| Metadata FMDL                          | Header/descriptor/string preview terinspeksi                   |
| Metadata FTEX                          | Header/frame/chunk bounds terinspeksi                          |
| `face_diff.bin`                        | Signature dan raw triplet terinspeksi; semantik belum teruji   |
| Decode geometri, UV, skeleton, weights | Belum diimplementasikan/dijalankan                             |
| Decode FTEX ke gambar                  | Belum dijalankan                                               |
| Import FMDL ke Blender                 | Belum dijalankan                                               |
| Konversi aset PES ke GLB               | Belum dijalankan; fixture GLB TASK 02 bukan bukti konversi PES |
| Export kembali ke PES                  | Belum dijalankan                                               |
| Round-trip struktur                    | Belum diuji                                                    |
| Kompatibilitas dalam game              | Belum diuji                                                    |

## Gerbang sebelum prototype konversi

Pilih revision adapter dengan lisensi dan asal kode yang jelas. Verifikasi versi Blender lewat proses terisolasi, bukan hanya README/bl_info. Lengkapi dependency material yang benar-benar dibutuhkan sampel. Setelah importer tersedia, simpan seluruh metadata asli sebagai sidecar; GLB preview bukan format perantara yang otomatis lossless untuk PES.

Round-trip berikutnya harus membandingkan vertex/index/topology dan urutan mesh, semua UV/seam, normals/tangents/handedness, material ID/parameter/sampler/path, bone ID/name/parent/transforms, bone groups, indeks dan nilai weights, bounds/LOD, dan metadata tambahan. Ukur perubahan/toleransi secara eksplisit. Export yang bisa dibaca kembali masih belum membuktikan game menerima aset.

Tidak ada addon pihak ketiga yang dipasang atau dieksekusi. Tidak ada proses Blender, pemasangan mod, perubahan database, T99, atau file instalasi game. Audit tooling dan status lisensi terdapat pada [riset format](pes-format-research.md).

import { useState } from "react";
import { Studio } from "../features/studio/Studio";

export function App() {
  const [page, setPage] = useState<"studio" | "about">("studio");
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-symbol">
            f<span> /</span>
          </span>
          <div>
            Face Studio<small>PES 2021</small>
          </div>
        </div>
        <nav aria-label="Navigasi utama">
          <button
            className={page === "studio" ? "active" : ""}
            aria-current={page === "studio" ? "page" : undefined}
            onClick={() => setPage("studio")}
          >
            <span aria-hidden="true">▧</span> Ruang kerja
          </button>
          <button disabled title="Belum tersedia pada TASK 01">
            <span aria-hidden="true">◇</span> Pustaka aset <small>Segera</small>
          </button>
          <button
            className={page === "about" ? "active" : ""}
            aria-current={page === "about" ? "page" : undefined}
            onClick={() => setPage("about")}
          >
            <span aria-hidden="true">ⓘ</span> Tentang studio
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="edition">Foundation edition</span>
          <p>
            Ruang untuk membentuk
            <br />
            identitas di lapangan.
          </p>
          <small>Versi 0.1.0 / TASK 02</small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            PES 2021 <span>/</span>{" "}
            {page === "studio" ? "Ruang kerja" : "Tentang studio"}
          </div>
          <span className="build-label">Pengembangan awal</span>
        </header>
        {page === "studio" ? (
          <Studio />
        ) : (
          <main className="about">
            <span className="section-label">Tentang aplikasi</span>
            <h1>PES 2021 Face Studio</h1>
            <p>
              Fondasi aplikasi desktop untuk alur kerja wajah dan rambut pemain
              PES 2021.
            </p>
            <h2>Batas versi ini</h2>
            <p>
              Impor GLB, navigasi kamera, dan mode tampilan 3D tersedia.
              Pembuatan proyek, Dual AI Engine, mesh editing, Blender
              Automation, dan validasi PES belum diimplementasikan.
            </p>
            <h2>Arsitektur modular</h2>
            <dl className="architecture">
              <div>
                <dt>Antarmuka</dt>
                <dd>React, TypeScript, Vite</dd>
              </div>
              <div>
                <dt>Desktop</dt>
                <dd>Tauri 2 dan Rust</dd>
              </div>
              <div>
                <dt>Viewport 3D</dt>
                <dd>Three.js dan React Three Fiber</dd>
              </div>
              <div>
                <dt>Worker mendatang</dt>
                <dd>Python dan Blender Automation</dd>
              </div>
            </dl>
            <p className="muted">
              Versi ini tidak membaca atau mengubah file game maupun instalasi
              Blender.
            </p>
          </main>
        )}
        <footer className="statusbar">
          <span>
            <i /> Shell aplikasi tersedia
          </span>
          <span>
            AI belum terhubung <b>/</b> Tidak ada proyek aktif
          </span>
          <span>v0.1.0</span>
        </footer>
      </div>
    </div>
  );
}

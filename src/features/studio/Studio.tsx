import { Viewport } from "../viewport/Viewport";

export function Studio() {
  return (
    <main className="studio">
      <div className="studio-heading">
        <div>
          <h1>Ruang kerja</h1>
          <p>Setiap pemain punya identitas.</p>
        </div>
        <button
          className="primary-button"
          disabled
          title="Pembuatan proyek belum tersedia"
        >
          ＋ Proyek baru
        </button>
      </div>
      <div className="workbench">
        <Viewport />
        <aside className="inspector" aria-label="Status modul">
          <div className="panel-bar">Status modul</div>
          <section className="module">
            <span className="module-number">AI</span>
            <h2>Dual AI Engine</h2>
            <p>
              Dua mesin, satu alur kreatif. Integrasi provider belum tersedia.
            </p>
            <div className="engine-row">
              <span>Engine A</span>
              <small>Belum terhubung</small>
            </div>
            <div className="engine-row">
              <span>Engine B</span>
              <small>Belum terhubung</small>
            </div>
          </section>
          <section className="module">
            <h2>Blender Worker</h2>
            <p>Otomasi pemrosesan wajah dan rambut.</p>
            <span className="state-label">Belum diimplementasikan</span>
          </section>
          <section className="module">
            <h2>PES Compatibility</h2>
            <p>Pemeriksaan kompatibilitas aset PES 2021.</p>
            <span className="state-label">Belum diimplementasikan</span>
          </section>
          <div className="inspector-note">
            Fondasi terlebih dahulu.
            <br />
            Tidak ada proses AI atau ekspor yang berjalan pada versi ini.
          </div>
        </aside>
      </div>
    </main>
  );
}

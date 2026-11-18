import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Scene, type CameraTelemetry } from "./Scene";
import { importGlb, type DisplayMode, type ImportedModel } from "./model";
import type { CameraView } from "./camera";
import "./viewport.css";

class CanvasBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <p role="alert" className="viewport-message">
        Renderer 3D gagal dimulai. Periksa dukungan WebGL2 atau coba ulang
        viewport.
      </p>
    ) : (
      this.props.children
    );
  }
}
const modes: { value: DisplayMode; label: string }[] = [
  { value: "solid", label: "Solid View" },
  { value: "wireframe", label: "Wireframe View" },
  { value: "textured", label: "Textured View" },
];
export function Viewport() {
  const [model, setModel] = useState<ImportedModel | null>(null);
  const [mode, setMode] = useState<DisplayMode>("textured");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [command, setCommand] = useState<{
    view: CameraView;
    sequence: number;
  }>({ view: "Reset", sequence: 0 });
  const [telemetry, setTelemetry] = useState<CameraTelemetry | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current++;
    };
  }, []);
  useEffect(() => () => model?.dispose(), [model]);
  const onCamera = useCallback(
    (value: CameraTelemetry) => setTelemetry(value),
    [],
  );
  const onLost = useCallback(() => setLost(true), []);
  async function open(file?: File) {
    if (!file) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const next = await importGlb(file);
      if (!alive.current || id !== request.current) {
        next.dispose();
        return;
      }
      setModel(next);
      setCommand((previous) => ({
        view: "Reset",
        sequence: previous.sequence + 1,
      }));
    } catch (reason) {
      if (alive.current && id === request.current)
        setError(
          reason instanceof Error ? reason.message : "Model gagal diimpor.",
        );
    } finally {
      if (alive.current && id === request.current) setLoading(false);
    }
  }
  return (
    <section className="workspace viewport-workspace" aria-label="Viewport 3D">
      <div className="panel-bar">
        <span>Viewport 3D</span>
        <span className="subtle">WebGL / glTF 2.0</span>
      </div>
      <div className="viewport-toolbar">
        <input
          ref={picker}
          type="file"
          accept=".glb"
          aria-label="File model GLB"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void open(file);
          }}
        />
        <button
          className="import-button"
          disabled={loading}
          onClick={() => picker.current?.click()}
        >
          {loading ? "Membaca GLB…" : "Import 3D Model"}
        </button>
        <div role="group" aria-label="Mode tampilan">
          {modes.map((item) => (
            <button
              key={item.value}
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="camera-toolbar" role="group" aria-label="Sudut kamera">
        {(["Front", "Left", "Right", "Back", "Reset"] as CameraView[]).map(
          (view) => (
            <button
              key={view}
              onClick={() =>
                setCommand((previous) => ({
                  view,
                  sequence: previous.sequence + 1,
                }))
              }
            >
              {view === "Reset" ? "Reset Camera" : `${view} View`}
            </button>
          ),
        )}
        <button
          onClick={() => {
            setLost(false);
            setGeneration((value) => value + 1);
          }}
        >
          Muat ulang viewport
        </button>
      </div>
      {error && (
        <div className="import-error" role="alert">
          {error} {model && "Model sebelumnya tetap ditampilkan."}
        </div>
      )}
      <div className="canvas-stage">
        {lost ? (
          <p role="alert" className="viewport-message">
            Koneksi WebGL terputus. Tekan Muat ulang viewport untuk memulihkan
            tampilan.
          </p>
        ) : (
          <CanvasBoundary key={generation}>
            <Canvas
              frameloop="demand"
              dpr={[1, 2]}
              camera={{ position: [3, 2, 3], fov: 40, near: 0.01, far: 1000 }}
              gl={{ antialias: true }}
              fallback={
                <p role="alert">
                  WebGL2 tidak tersedia. Periksa driver grafis dan WebView2.
                </p>
              }
            >
              <Scene
                model={model}
                mode={mode}
                command={command}
                onCamera={onCamera}
                onLost={onLost}
              />
            </Canvas>
          </CanvasBoundary>
        )}
        {!model && !lost && (
          <div className="viewport-empty">
            <h2>Mulai dari model Anda.</h2>
            <p>
              Impor GLB mandiri untuk melihat wajah atau rambut.
              <br />
              Maksimum 64 MiB. File tetap berada di perangkat Anda.
            </p>
          </div>
        )}
        <div className="orientation" aria-label="Orientasi kamera">
          <span>
            <b className="axis-x">X</b> kanan <b className="axis-y">Y</b> atas{" "}
            <b className="axis-z">Z</b> depan
          </span>
          <output
            data-testid="camera-pose"
            data-position={JSON.stringify(telemetry?.position)}
            data-target={JSON.stringify(telemetry?.target)}
            data-distance={telemetry?.distance}
          >
            {telemetry
              ? `Kamera ${telemetry.position.map((n) => n.toFixed(2)).join(" / ")}`
              : "Menyiapkan kamera…"}
          </output>
        </div>
      </div>
      <div className="model-information" aria-label="Informasi model">
        <div>
          <span>Model</span>
          <strong title={model?.name}>
            {model?.name ?? "Belum ada model"}
          </strong>
        </div>
        <div>
          <span>Ukuran file</span>
          <strong>
            {model ? `${model.bytes.toLocaleString("id-ID")} byte` : "—"}
          </strong>
        </div>
        <div>
          <span>Mesh</span>
          <strong>{model?.meshCount ?? "—"}</strong>
        </div>
        <div>
          <span>Bounds X / Y / Z</span>
          <strong data-testid="model-bounds">
            {model
              ? model.size
                  .toArray()
                  .map((n) => n.toFixed(3))
                  .join(" / ")
              : "—"}
          </strong>
        </div>
      </div>
      <div className="workspace-footer">
        <span>Drag kiri: orbit · Scroll: zoom · Drag kanan: pan</span>
        <span>Transformasi asli dipertahankan</span>
      </div>
    </section>
  );
}

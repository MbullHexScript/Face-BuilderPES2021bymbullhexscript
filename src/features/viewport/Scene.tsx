import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Object3D, PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { frameCamera, type CameraView } from "./camera";
import type { DisplayMode, ImportedModel } from "./model";

export interface CameraTelemetry {
  position: number[];
  target: number[];
  distance: number;
}
export function Scene({
  model,
  mode,
  command,
  onCamera,
  onLost,
}: {
  model: ImportedModel | null;
  mode: DisplayMode;
  command: { view: CameraView; sequence: number };
  onCamera: (value: CameraTelemetry) => void;
  onLost: () => void;
}) {
  const { camera, gl, invalidate, size } = useThree();
  const radius = model?.radius ?? 1;
  const center = model?.center ?? new Vector3();
  const lightTarget = useMemo(() => new Object3D(), []);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.copy(model?.center ?? new Vector3());
    const r = model?.radius ?? 1;
    const distance = frameCamera(camera, controls.target, r, command.view);
    controls.minDistance = r * 0.05;
    controls.maxDistance = distance + r * 45;
    controls.enableDamping = false;
    const changed = () => {
      invalidate();
      onCamera({
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        distance: controls.getDistance(),
      });
    };
    controls.addEventListener("change", changed);
    controls.update();
    changed();
    return () => {
      controls.removeEventListener("change", changed);
      controls.dispose();
    };
  }, [
    camera,
    gl,
    invalidate,
    model,
    command,
    size.width,
    size.height,
    onCamera,
  ]);
  useLayoutEffect(() => {
    model?.setMode(mode);
    invalidate();
  }, [model, mode, invalidate]);
  return (
    <>
      <color attach="background" args={["#191c22"]} />
      <hemisphereLight args={["#e7efff", "#535666", 2]} />
      <primitive object={lightTarget} position={center.toArray()} />
      <directionalLight
        position={[
          center.x + radius * 3,
          center.y + radius * 4,
          center.z + radius * 3,
        ]}
        intensity={2.5}
        target={lightTarget}
      />
      <directionalLight
        position={[
          center.x - radius * 3,
          center.y + radius,
          center.z - radius * 2,
        ]}
        intensity={1.4}
        color="#b4caff"
        target={lightTarget}
      />
      <group
        position={[
          center.x,
          (model?.bounds.min.y ?? 0) - radius * 0.01,
          center.z,
        ]}
      >
        <gridHelper args={[radius * 6, 20, "#536077", "#303947"]} />
        <axesHelper args={[radius * 0.7]} />
      </group>
      {model && <primitive object={model.root} dispose={null} />}
    </>
  );
}

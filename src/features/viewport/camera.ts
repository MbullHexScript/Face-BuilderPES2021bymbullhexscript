import { MathUtils, PerspectiveCamera, Vector3 } from "three";
export type CameraView = "Front" | "Left" | "Right" | "Back" | "Reset";
const directions: Record<CameraView, Vector3> = {
  Front: new Vector3(0, 0, 1),
  Left: new Vector3(-1, 0, 0),
  Right: new Vector3(1, 0, 0),
  Back: new Vector3(0, 0, -1),
  Reset: new Vector3(1, 0.65, 1),
};
/** Fit a bounding sphere to the narrower FOV; model coordinates stay untouched. */
export function frameCamera(
  camera: PerspectiveCamera,
  center: Vector3,
  radius: number,
  view: CameraView,
) {
  const vertical = MathUtils.degToRad(camera.fov) / 2;
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = (radius / Math.sin(Math.min(vertical, horizontal))) * 1.18;
  camera.near = Math.max(radius / 1000, 1e-10);
  camera.far = distance + radius * 100;
  camera.up.set(0, 1, 0);
  camera.position
    .copy(center)
    .addScaledVector(directions[view].clone().normalize(), distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  return distance;
}

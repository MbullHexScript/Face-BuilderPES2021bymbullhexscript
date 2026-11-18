import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Texture,
  Vector3,
} from "three";
import { frameCamera } from "../src/features/viewport/camera";
import { prepareModel, validateGlb } from "../src/features/viewport/model";

test("material modes preserve originals, matrices and grouped materials; disposal is exactly once", () => {
  const scene = new Group(),
    geometry = new BoxGeometry(2, 2, 2);
  const texture = new Texture();
  const a = new MeshStandardMaterial({ map: texture }),
    b = new MeshStandardMaterial({ color: "red" });
  const mesh = new Mesh(geometry, [a, b]);
  mesh.position.set(2, 1, -1);
  mesh.scale.set(1, 1.5, 0.75);
  scene.add(mesh);
  const model = prepareModel({ scene, scenes: [scene] }, "test.glb", 100);
  const matrix = mesh.matrixWorld.toArray(),
    materials = mesh.material;
  model.setMode("solid");
  expect(mesh.material).not.toBe(materials);
  expect(mesh.material[0].map).toBeNull();
  model.setMode("wireframe");
  expect(mesh.material.every((m) => m.wireframe)).toBe(true);
  model.setMode("textured");
  expect(mesh.material[0]).toBe(a);
  expect(mesh.material[1]).toBe(b);
  expect(mesh.material[0].map).toBe(texture);
  expect(mesh.matrixWorld.toArray()).toEqual(matrix);
  expect(model.size.toArray()).toEqual([2, 3, 1.5]);
  const counts = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener("dispose", () => counts.geometry++);
  a.addEventListener("dispose", () => counts.material++);
  texture.addEventListener("dispose", () => counts.texture++);
  model.dispose();
  model.dispose();
  expect(counts).toEqual({ geometry: 1, material: 1, texture: 1 });
});

test("framing fits all sphere extremes in wide and narrow canvases", () => {
  for (const aspect of [0.4, 1, 2.5]) {
    const camera = new PerspectiveCamera(40, aspect);
    const center = new Vector3(200, 100, -50),
      radius = 38;
    frameCamera(camera, center, radius, "Front");
    camera.updateMatrixWorld(true);
    for (const vector of [
      new Vector3(radius, 0, 0),
      new Vector3(-radius, 0, 0),
      new Vector3(0, radius, 0),
      new Vector3(0, -radius, 0),
    ]) {
      const ndc = vector.add(center).project(camera);
      expect(Math.abs(ndc.x)).toBeLessThan(1);
      expect(Math.abs(ndc.y)).toBeLessThan(1);
      expect(Math.abs(ndc.z)).toBeLessThan(1);
    }
  }
});

test("GLB envelope rejects truncation, bad magic, wrong sizes and external URLs", () => {
  const bytes = new Uint8Array(readFileSync("tests/fixtures/calibration.glb"));
  expect(validateGlb(bytes.buffer).asset).toBeTruthy();
  expect(() => validateGlb(bytes.buffer.slice(0, 16))).toThrow();
  const wrong = bytes.slice();
  new DataView(wrong.buffer).setUint32(0, 0, true);
  expect(() => validateGlb(wrong.buffer)).toThrow("versi 2");
  expect(() => validateGlb(bytes.buffer.slice(0, -4))).toThrow("Panjang");
  expect(() =>
    validateGlb(
      new Uint8Array(readFileSync("tests/fixtures/external-resource.glb"))
        .buffer,
    ),
  ).toThrow("eksternal");
});

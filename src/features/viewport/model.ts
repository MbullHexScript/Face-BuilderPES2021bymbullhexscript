import {
  Box3,
  BufferGeometry,
  Material,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Texture,
  Vector3,
} from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

export type DisplayMode = "textured" | "solid" | "wireframe";
export const MAX_GLB_BYTES = 64 * 1024 * 1024;

/** Validate the envelope before the loader can issue any resource request. */
export function validateGlb(data: ArrayBuffer) {
  if (data.byteLength < 20 || data.byteLength > MAX_GLB_BYTES)
    throw new Error("GLB kosong, terpotong, atau melebihi batas 64 MiB.");
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2)
    throw new Error("File bukan GLB versi 2 yang valid.");
  if (view.getUint32(8, true) !== data.byteLength)
    throw new Error("Panjang file tidak sesuai header GLB.");
  let offset = 12;
  let document: Record<string, unknown> | undefined;
  let chunks = 0;
  while (offset < data.byteLength) {
    if (offset + 8 > data.byteLength)
      throw new Error("Header chunk GLB terpotong.");
    const size = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true);
    if (size % 4 || offset + 8 + size > data.byteLength)
      throw new Error("Batas chunk GLB tidak valid.");
    if (chunks === 0) {
      if (type !== 0x4e4f534a) throw new Error("Chunk pertama GLB harus JSON.");
      try {
        document = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            new Uint8Array(data, offset + 8, size),
          ),
        );
      } catch {
        throw new Error("Metadata JSON GLB tidak valid.");
      }
    } else if (chunks !== 1 || type !== 0x004e4942)
      throw new Error("Susunan chunk GLB belum didukung.");
    chunks++;
    offset += 8 + size;
  }
  if (!document || typeof document !== "object" || Array.isArray(document))
    throw new Error("Metadata GLB tidak valid.");
  const asset = document.asset as { version?: string } | undefined;
  if (asset?.version !== "2.0")
    throw new Error("Hanya glTF 2.0 yang didukung.");
  // The local-file workflow supports self-contained GLB only, never remote references.
  function inspect(value: unknown): void {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (
        key === "uri" &&
        (typeof item !== "string" || !item.startsWith("data:"))
      )
        throw new Error(
          "GLB harus mandiri: referensi file/URL eksternal tidak didukung.",
        );
      inspect(item);
    }
  }
  inspect(document);
  const extensions = [
    ...(Array.isArray(document.extensionsRequired)
      ? document.extensionsRequired
      : []),
    ...(Array.isArray(document.extensionsUsed) ? document.extensionsUsed : []),
  ];
  if (
    extensions.some((x) =>
      [
        "KHR_draco_mesh_compression",
        "EXT_meshopt_compression",
        "KHR_texture_basisu",
      ].includes(String(x)),
    )
  )
    throw new Error(
      "GLB memakai kompresi Draco/Meshopt/KTX2 yang belum didukung. Ekspor GLB tanpa kompresi tersebut.",
    );
  return document;
}

interface OwnedResources {
  roots: Object3D[];
  materials: Material[];
  textures: Texture[];
  geometries: BufferGeometry[];
}
const emptyResources = (): OwnedResources => ({
  roots: [],
  materials: [],
  textures: [],
  geometries: [],
});
export function disposeResources(
  roots: Object3D[],
  extra: Material[] = [],
  owned = emptyResources(),
) {
  const geometries = new Set<BufferGeometry>(owned.geometries),
    materials = new Set<Material>(extra),
    textures = new Set<Texture>(owned.textures),
    skeletons = new Set<Skeleton>();
  owned.materials.forEach((material) => materials.add(material));
  [...roots, ...owned.roots].forEach((root) =>
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material)
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((m) => materials.add(m));
      if ((object as SkinnedMesh).isSkinnedMesh)
        skeletons.add((object as SkinnedMesh).skeleton);
    }),
  );
  materials.forEach((material) =>
    Object.values(material).forEach((value) => {
      if (value instanceof Texture) textures.add(value);
    }),
  );
  const images = new Set<{ close?: () => void }>();
  textures.forEach((texture) => {
    if (texture.source?.data) images.add(texture.source.data);
    texture.dispose();
  });
  images.forEach((image) => image.close?.());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  skeletons.forEach((skeleton) => skeleton.dispose());
}

export function prepareModel(
  gltf: Pick<GLTF, "scene" | "scenes">,
  name: string,
  bytes: number,
  owned = emptyResources(),
) {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(root, true);
  const center = bounds.getCenter(new Vector3()),
    size = bounds.getSize(new Vector3());
  const radius = size.length() / 2;
  const meshes: Mesh[] = [];
  root.traverse((node) => {
    if ((node as Mesh).isMesh) meshes.push(node as Mesh);
  });
  if (
    !meshes.length ||
    bounds.isEmpty() ||
    ![...center, ...size, radius].every(Number.isFinite) ||
    radius < 1e-8 ||
    radius > 1e8 ||
    center.length() > 1e10
  ) {
    throw new Error(
      "Model tidak memiliki mesh dengan bounds yang dapat ditampilkan (ukuran/koordinat di luar batas viewport).",
    );
  }
  const original = new Map(meshes.map((mesh) => [mesh, mesh.material]));
  const variants = new Map<
    Material,
    { solid: MeshStandardMaterial; wireframe: MeshStandardMaterial }
  >();
  original.forEach((value) =>
    (Array.isArray(value) ? value : [value]).forEach((material) => {
      if (!variants.has(material)) {
        const options = {
          color: 0xb4bdc9,
          roughness: 0.8,
          metalness: 0,
          side: material.side,
        };
        variants.set(material, {
          solid: new MeshStandardMaterial(options),
          wireframe: new MeshStandardMaterial({
            ...options,
            color: 0x9dc6ff,
            wireframe: true,
          }),
        });
      }
    }),
  );
  let disposed = false;
  return {
    root,
    bounds,
    center,
    size,
    radius,
    name,
    bytes,
    meshCount: meshes.length,
    setMode(mode: DisplayMode) {
      if (disposed) return;
      original.forEach((value, mesh) => {
        const replacement = (material: Material) =>
          mode === "textured" ? material : variants.get(material)![mode];
        mesh.material = Array.isArray(value)
          ? value.map(replacement)
          : replacement(value);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      original.forEach((value, mesh) => {
        mesh.material = value;
      });
      disposeResources(
        gltf.scenes,
        [...variants.values()].flatMap((v) => [v.solid, v.wireframe]),
        owned,
      );
    },
  };
}
export type ImportedModel = ReturnType<typeof prepareModel>;

export async function importGlb(file: File): Promise<ImportedModel> {
  if (!/\.glb$/i.test(file.name))
    throw new Error("Pilih file dengan ekstensi .glb.");
  if (file.size > MAX_GLB_BYTES)
    throw new Error("Ukuran GLB melebihi batas 64 MiB.");
  const data = await file.arrayBuffer();
  validateGlb(data);
  const manager = new LoadingManager();
  const urls = new Set<string>();
  let resourceFailed = false;
  manager.onError = () => {
    resourceFailed = true;
  };
  manager.setURLModifier((url) => {
    if (url.startsWith("blob:")) urls.add(url);
    else if (!url.startsWith("data:"))
      throw new Error("Referensi eksternal tidak diizinkan.");
    return url;
  });
  const loader = new GLTFLoader(manager);
  const owned = emptyResources();
  const pending = new Set<Promise<unknown>>();
  // Capture resolved dependencies, including intermediate resources when parsing fails.
  // getDependency is the loader's documented extension seam; do not access its cache.
  loader.register((parser) => {
    const getDependency = parser.getDependency.bind(parser);
    parser.getDependency = (type, index) => {
      const promise = getDependency(type, index);
      pending.add(promise);
      promise.then(
        (value) => {
          if (value instanceof Object3D) owned.roots.push(value);
          else if (value instanceof Material) owned.materials.push(value);
          else if (value instanceof Texture) owned.textures.push(value);
          else if (value instanceof BufferGeometry)
            owned.geometries.push(value);
          pending.delete(promise);
        },
        () => {
          pending.delete(promise);
        },
      );
      return promise;
    };
    return { name: "FACE_STUDIO_RESOURCE_OWNERSHIP" };
  });
  try {
    const gltf = await loader.parseAsync(data, "");
    if (resourceFailed)
      throw new Error("Tekstur atau resource GLB gagal dimuat.");
    return prepareModel(gltf, file.name, file.size, owned);
  } catch (error) {
    while (pending.size) await Promise.allSettled([...pending]);
    disposeResources([], [], owned);
    throw new Error(
      `GLB gagal dibaca: ${error instanceof Error ? error.message : "struktur tidak didukung"}`,
    );
  } finally {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }
}

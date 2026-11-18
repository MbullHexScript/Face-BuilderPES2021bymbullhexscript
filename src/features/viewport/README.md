# Viewport 3D — TASK 02

- `Viewport.tsx`: file picker lokal, import state/race guard, error boundary, toolbar, model info.
- `Scene.tsx`: Canvas content, OrbitControls, lighting, grid, axis helpers, context loss.
- `model.ts`: GLB v2 envelope validation, local-resource policy, loader, material variants, GPU cleanup.
- `camera.ts`: bounding-sphere fitting and canonical camera views.
- `viewport.css`: extension of the existing Dark Studio theme.

No extra dependencies; uses Three.js and React Three Fiber already installed. No filesystem IPC. User chooses a self-contained GLB through the web file picker. File cap: 64 MiB, not a bound on expanded GPU memory. Draco/Meshopt/KTX2 and external resources are rejected. Static triangle meshes are the tested scope; no animation playback or mesh editing.

Front is +Z, left -X, right +X, back -Z. Reset gives a diagonal view. Model transforms stay unchanged. Resizing resets framing to the last camera preset. Leaving the workspace releases the loaded model; no persistence yet.

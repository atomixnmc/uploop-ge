/**
 * 31-ray-tracer — Interactive software path tracer.
 *
 * Casts rays through a procedural scene of spheres and cubes. Progressive
 * rendering: accumulates samples per pixel and displays the framebuffer.
 * Orbit camera: drag to rotate, scroll to zoom.
 *
 * State: { samples, cameraAngle, cameraPitch, cameraDist }
 * Update: none (progressive accumulation)
 * Render: trace rays, accumulate into canvas ImageData
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, mat4 } from "@uploop/math";
import { createCube, createSphere } from "@uploop/geometry";
import { createRayTracer, createRay, createCameraRay } from "@uploop/ray-tracing";

export function init(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return console.error("2D context not available");

  // ── Build scene geometry ──────────────────────────────────────
  const entities = [];

  // Floor
  const floor = createCube(10);
  floor.vertices[1] = -1; // squash Y
  entities.push({
    mesh: floor,
    material: { albedo: [0.6, 0.6, 0.65], roughness: 0.8, emission: null },
    transform: { position: [0, -1.5, 0], scale: [10, 0.1, 10] },
  });

  // Spheres
  const sphere = createSphere(0.5, 12, 6);
  const sphereColors = [
    { albedo: [0.9, 0.3, 0.3], roughness: 0.3, emission: null },
    { albedo: [0.3, 0.7, 0.3], roughness: 0.5, emission: null },
    { albedo: [0.3, 0.4, 0.9], roughness: 0.2, emission: null },
  ];
  for (let i = 0; i < 3; i++) {
    entities.push({
      mesh: sphere,
      material: sphereColors[i],
      transform: { position: [-1.5 + i * 1.5, -0.3 + i * 0.15, i * 0.5 - 1] },
    });
  }

  // Emissive cube (light source)
  const light = createCube(0.4);
  entities.push({
    mesh: light,
    material: { albedo: [1, 1, 1], roughness: 0, emission: [3, 2.5, 2] },
    transform: { position: [0, 2.5, 0] },
  });

  // ── Ray tracer ────────────────────────────────────────────────
  const tracer = createRayTracer({ entities, maxDepth: 3, skyColor: [0.3, 0.4, 0.6] });

  // ── Camera ────────────────────────────────────────────────────
  let camAngle = -0.3, camPitch = 0.4, camDist = 6;
  let dragging = false, lastMX = 0, lastMY = 0;

  function getCamera() {
    const pos = vec3.create();
    pos[0] = Math.cos(camAngle) * Math.cos(camPitch) * camDist;
    pos[1] = Math.sin(camPitch) * camDist + 1;
    pos[2] = Math.sin(camAngle) * Math.cos(camPitch) * camDist;
    return {
      position: pos,
      target: vec3.set(vec3.create(), 0, 0, 0),
      up: vec3.set(vec3.create(), 0, 1, 0),
      fov: Math.PI / 4,
    };
  }

  // ── Responsive canvas ─────────────────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(960, Math.min(window.innerWidth * 0.7, 1280));
    const h = Math.max(540, Math.min(window.innerHeight * 0.7, 720));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }
  resize();
  window.addEventListener("resize", resize);

  // ── Accumulation buffer ───────────────────────────────────────
  const W = canvas.width;
  const H = canvas.height;
  const accumR = new Float32Array(W * H);
  const accumG = new Float32Array(W * H);
  const accumB = new Float32Array(W * H);
  let samples = 0;

  // ── Game Loop ─────────────────────────────────────────────────
  const loop = createGameLoop({
    state: { samples: 0, tracing: true },

    update: {
      tick(s, dt) {
        return { ...s, samples: s.samples + 1 };
      },
      pause(s) {
        return { ...s, tracing: !s.tracing };
      },
    },

    render(state, alpha) {
      if (!state.tracing) return;

      const cam = getCamera();
      const aspect = canvas.width / canvas.height;

      // Trace one sample per pixel (progressive)
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const ray = createCameraRay(
            cam.position, cam.target, cam.up,
            cam.fov, aspect,
            x + Math.random(), y + Math.random(), W, H,
          );

          const col = tracer.pathTrace(ray);
          const idx = y * W + x;
          accumR[idx] += col[0];
          accumG[idx] += col[1];
          accumB[idx] += col[2];

          // Write to canvas
          const si = Math.min(state.samples, 1);
          const r = Math.min(255, (accumR[idx] / si) * 255);
          const g = Math.min(255, (accumG[idx] / si) * 255);
          const b = Math.min(255, (accumB[idx] / si) * 255);

          const pxIdx = idx * 4;
          imageData.data[pxIdx] = r;
          imageData.data[pxIdx + 1] = g;
          imageData.data[pxIdx + 2] = b;
          imageData.data[pxIdx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      updateOverlay();

      // Reset accumulation to prevent blowout
      if (state.samples > 100) {
        for (let i = 0; i < W * H; i++) {
          accumR[i] *= 0.5;
          accumG[i] *= 0.5;
          accumB[i] *= 0.5;
        }
        loop.setState({ samples: 50 });
      }
    },
  });

  // Create ImageData for GPU-less rendering
  const imageData = ctx.createImageData(W, H);

  loop.start();

  // ── Mouse controls ────────────────────────────────────────────
  canvas.addEventListener("mousedown", (e) => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; });
  window.addEventListener("mouseup", () => { dragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    camAngle += (e.clientX - lastMX) * 0.005;
    camPitch = Math.max(-1.4, Math.min(1.4, camPitch + (e.clientY - lastMY) * 0.005));
    lastMX = e.clientX; lastMY = e.clientY;
    // Reset accumulation on camera move
    accumR.fill(0); accumG.fill(0); accumB.fill(0);
    loop.setState({ samples: 0 });
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    camDist = Math.max(2, Math.min(12, camDist + e.deltaY * 0.005));
    accumR.fill(0); accumG.fill(0); accumB.fill(0);
    loop.setState({ samples: 0 });
  });

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute", bottom: "8px", left: "8px",
    fontFamily: "monospace", fontSize: "12px", zIndex: "10",
    display: "flex", gap: "8px",
  });
  const fpsEl = document.createElement("span");
  const samplesEl = document.createElement("span");
  const hintEl = document.createElement("span");
  for (const el of [fpsEl, samplesEl, hintEl]) {
    el.style.cssText = "color:#fff;background:#0008;padding:4px 10px;border-radius:4px";
  }
  overlay.append(fpsEl, samplesEl, hintEl);
  canvas.parentElement.appendChild(overlay);

  function updateOverlay() {
    fpsEl.textContent = `FPS: ${loop.fps}`;
    samplesEl.textContent = `Samples: ${loop.getState().samples}`;
    hintEl.textContent = "🖱️ Drag orbit  ·  Scroll zoom";
  }

  return () => {
    loop.stop();
    overlay.remove();
  };
}

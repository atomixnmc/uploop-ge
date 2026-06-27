/**
 * 29-cinematic-camera — Director-driven camera tour through a 3D scene.
 *
 * Uses @uploop/director to sequence dolly, orbit, crane, and zoom behaviors
 * across a procedural city grid. Click to skip to next behavior.
 *
 * State: { director, cubes }
 * Update: director.update(dt)
 * Render: draws scene from director's camera position
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, mat4 } from "@uploop/math";
import { createCube } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";
import { createDirector, dolly, orbit, crane, zoom, timeline, lookAt, bounds } from "@uploop/director";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Shader & Mesh ──────────────────────────────────────────────
  const shader = createProgram(gl, builtinShaders.unlit.vertex, builtinShaders.unlit.fragment);
  const cube = createCube(0.5);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(shader.attributes.aPosition.location);
  gl.vertexAttribPointer(shader.attributes.aPosition.location, 3, gl.FLOAT, false, 32, 0);

  // ── Scene: procedural city grid ────────────────────────────────
  const buildingPositions = [];
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      if (Math.abs(x) < 1 && Math.abs(z) < 1) continue; // center plaza
      const h = 0.5 + Math.random() * 4;
      buildingPositions.push({
        pos: [x * 1.5, h / 2, z * 1.5],
        scale: [0.6 + Math.random() * 0.4, h, 0.6 + Math.random() * 0.4],
        color: [0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.3, 0.5 + Math.random() * 0.5],
      });
    }
  }

  // ── Director ───────────────────────────────────────────────────
  const director = createDirector({ position: [0, 6, 10], target: [0, 0, 0] });
  director.addConstraint(lookAt([0, 0.5, 0]));

  const tour = timeline([
    dolly({ from: [0, 6, 10], to: [5, 3, 5], duration: 3, easing: "easeInOutCubic" }),
    orbit({ target: [0, 1, 0], radius: 8, speed: 0.3, pitch: 0.5, duration: 5, easing: "linear" }),
    crane({ base: [3, 0, 3], height: 8, swing: Math.PI * 0.7, duration: 4, easing: "easeInOutQuad" }),
    dolly({ from: [0, 0, 8], to: [-5, 2, -5], duration: 3, easing: "easeInOutCubic" }),
    orbit({ target: [0, 1, 0], radius: 4, speed: 0.5, pitch: 0.2, duration: 4, easing: "linear" }),
    dolly({ from: [0, 6, 10], to: [0, 6, 10], duration: 2, easing: "easeOutCubic" }),
  ], { loop: true });

  director.play(tour);

  // ── Responsive canvas ─────────────────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1280, window.innerWidth * 0.9);
    const h = Math.max(720, window.innerHeight * 0.85);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.08, 0.08, 0.15, 1);

  // ── Game Loop ─────────────────────────────────────────────────
  const projection = mat4.create();
  const view = mat4.create();
  const model = mat4.create();

  const loop = createGameLoop({
    state: { buildingCount: buildingPositions.length, currentBehavior: "dolly" },

    update: {
      tick(s, dt) {
        director.update(dt);
        return { ...s, currentBehavior: director.active?.type || "idle" };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      const { cameraPosition, cameraTarget, fov } = director;
      const aspect = canvas.width / canvas.height;
      mat4.perspective(projection, fov, aspect, 0.1, 100);
      mat4.lookAt(view, cameraPosition, cameraTarget, [0, 1, 0]);

      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(shader.uniforms.uProjection.location, false, projection);

      for (const b of buildingPositions) {
        mat4.fromRotationTranslationScaleOrigin(model, [0, 0, 0, 1], b.pos, b.scale);
        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
        gl.uniform4f(shader.uniforms.uColor.location, ...b.color, 1);
        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, cube.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      updateOverlay();
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── Click to skip behavior ────────────────────────────────────
  canvas.addEventListener("click", () => director.skip());

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute", bottom: "8px", left: "8px",
    fontFamily: "monospace", fontSize: "12px", zIndex: "10",
    display: "flex", gap: "8px",
  });
  const fpsEl = document.createElement("span");
  const behaviorEl = document.createElement("span");
  const hintEl = document.createElement("span");
  for (const el of [fpsEl, behaviorEl, hintEl]) {
    el.style.cssText = "color:#fff;background:#0008;padding:4px 10px;border-radius:4px";
  }
  overlay.append(fpsEl, behaviorEl, hintEl);
  canvas.parentElement.appendChild(overlay);

  function updateOverlay() {
    fpsEl.textContent = `FPS: ${loop.fps}`;
    behaviorEl.textContent = `Camera: ${loop.getState().currentBehavior}`;
    hintEl.textContent = "🖱️ Click to skip";
  }

  return () => {
    loop.stop();
    overlay.remove();
    director.dispose();
  };
}

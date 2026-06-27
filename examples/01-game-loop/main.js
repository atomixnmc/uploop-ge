/**
 * 01-game-loop — Simplest uploop architecture: state → update → render.
 *
 * Demonstrates the core pattern:
 *   - Immutable state changed only via event handlers
 *   - Fixed-timestep update decoupled from render rate
 *   - Render receives state + interpolation alpha for smooth visuals
 *
 * Buttons add/remove rotating cubes. Open console and run:
 *   canvas._loop.describe()   → HyperGraph manifest
 */
import { createGameLoop } from "@uploop/scene";
import { mat4 } from "@uploop/math";
import { createCube } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Shader & Mesh ────────────────────────────────────────────
  const shader = createProgram(
    gl,
    builtinShaders.unlit.vertex,
    builtinShaders.unlit.fragment,
  );
  const mesh = createCube(0.8);

  // VAO (PNU format: stride=32, pos@0, uv@24)
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(shader.attributes.aPosition.location);
  gl.vertexAttribPointer(
    shader.attributes.aPosition.location,
    3,
    gl.FLOAT,
    false,
    32,
    0,
  );
  gl.enableVertexAttribArray(shader.attributes.aUV.location);
  gl.vertexAttribPointer(
    shader.attributes.aUV.location,
    2,
    gl.FLOAT,
    false,
    32,
    24,
  );

  // ── Responsive canvas (min 720p) ──────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1280, window.innerWidth * 0.9);
    const h = Math.max(720, window.innerHeight * 0.85);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    updateProjection();
  }
  window.addEventListener("resize", resize);

  // ── Camera ───────────────────────────────────────────────────
  const projection = mat4.create();
  const view = mat4.create();
  mat4.lookAt(view, [0, 2.5, 6], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.08, 0.08, 0.13, 1);
  resize();

  // ── Game Loop ("uploop") ─────────────────────────────────────
  const model = mat4.create();

  const loop = createGameLoop({
    state: { cubes: 1, rotation: 0 },

    update: {
      /** Fixed-timestep: advance rotation each physics tick */
      tick(s, dt) {
        return { rotation: s.rotation + dt * 0.8 };
      },
      addCube(s) {
        return { cubes: s.cubes + 1 };
      },
      removeCube(s) {
        return { cubes: Math.max(1, s.cubes - 1) };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      // Interpolate rotation between fixed steps for smooth motion
      const rot = state.rotation + alpha * loop.fixedTimestep * 0.8;

      for (let i = 0; i < state.cubes; i++) {
        const offset = (i - (state.cubes - 1) / 2) * 1.5;
        mat4.fromYRotation(model, rot + i * 0.3);
        model[12] = offset;
        model[14] = Math.sin(rot + i) * 0.4; // slight Z wave

        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
        gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
        gl.uniformMatrix4fv(
          shader.uniforms.uProjection.location,
          false,
          projection,
        );
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
      }
    },
  });

  // Static uniforms
  gl.useProgram(shader.program);
  gl.uniform4f(shader.uniforms.uColor.location, 0.9, 0.35, 0.3, 1);
  gl.uniform1i(shader.uniforms.uHasTexture.location, 0);

  loop.start();

  // Expose for devtools
  canvas._loop = loop;

  // ── UI Overlay ───────────────────────────────────────────────
  const overlay = createOverlay(canvas, loop);

  console.log(
    "%c🚀 uploop running%c | canvas._loop.describe() → HyperGraph manifest",
    "color:#4f8",
    "",
  );

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (overlay) overlay.remove();
  };
}

function createOverlay(canvas, loop) {
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    display: "flex",
    gap: "6px",
    alignItems: "center",
    fontFamily: "monospace",
    zIndex: "10",
    userSelect: "none",
  });

  const count = document.createElement("span");
  count.style.cssText =
    "color:#fff;background:#0008;padding:4px 10px;border-radius:4px";

  const dec = btn("-", () => loop.send("removeCube"));
  const inc = btn("+", () => loop.send("addCube"));

  loop.subscribe((s) => {
    count.textContent = `Cubes: ${s.cubes}`;
  });
  count.textContent = "Cubes: 1";

  div.append(count, dec, inc);
  canvas.parentElement.appendChild(div);
  return div;
}

function btn(text, click) {
  const b = document.createElement("button");
  b.textContent = text;
  Object.assign(b.style, {
    background: "#333",
    color: "#fff",
    border: "1px solid #555",
    padding: "4px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    lineHeight: "1",
  });
  b.addEventListener("click", click);
  return b;
}

/**
 * 02-entities — Entity creation/destruction through the loop.
 *
 * Left-click to spawn a cube at the mouse world position.
 * Right-click to destroy the nearest entity.
 *
 * Demonstrates event-driven entity management via loop.send().
 * Each entity holds a Transform and mesh reference for rendering.
 */
import { createGameLoop, Transform, Entity } from "@uploop/scene";
import { vec3, quat, mat4 } from "@uploop/math";
import { createCube } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Shared Geometry & Shader ─────────────────────────────────
  const shader = createProgram(
    gl,
    builtinShaders.unlit.vertex,
    builtinShaders.unlit.fragment,
  );
  const mesh = createCube(0.5);

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
  mat4.lookAt(view, [0, 4, 8], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.08, 0.08, 0.13, 1);
  resize();

  // Inverted VP for screen→world unproject
  const vpInv = mat4.create();

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: { entities: [] },

    update: {
      /** Spawn entity at world position (sent from click handler) */
      spawn(s, x, y, z) {
        const entity = Entity({
          name: `entity_${s.entities.length + 1}`,
          transform: Transform(vec3.create(x, y, z)),
          meshId: "cube",
          components: {
            spinSpeed: (Math.random() - 0.5) * 3,
            color: [
              Math.random() * 0.6 + 0.4,
              Math.random() * 0.4 + 0.2,
              Math.random() * 0.6 + 0.3,
            ],
          },
        });
        return { entities: [...s.entities, entity] };
      },

      /** Destroy entity by ID */
      destroy(s, id) {
        return { entities: s.entities.filter((e) => e.id !== id) };
      },

      /** Spin each entity */
      tick(s, dt) {
        for (const e of s.entities) {
          e.transform.rotate(
            quat.fromEuler(quat.create(), 0, e.components.spinSpeed * dt, 0),
          );
        }
        return s;
      },
    },

    render(state, alpha) {
      // Recompute inverted VP for unproject
      mat4.multiply(vpInv, projection, view);
      mat4.invert(vpInv, vpInv);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      for (const e of state.entities) {
        const [r, g, b] = e.components.color;
        gl.uniform4f(shader.uniforms.uColor.location, r, g, b, 1);
        gl.uniformMatrix4fv(
          shader.uniforms.uModel.location,
          false,
          e.transform.worldMatrix,
        );
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

  gl.useProgram(shader.program);
  gl.uniform1i(shader.uniforms.uHasTexture.location, 0);

  loop.start();
  canvas._loop = loop;

  // ── Input Handling ───────────────────────────────────────────
  canvas.addEventListener("click", (e) => {
    const wp = screenToWorld(canvas, e.clientX, e.clientY, vpInv);
    if (wp) loop.send("spawn", wp[0], wp[1], wp[2]);
  });

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const state = loop.getState();
    if (state.entities.length === 0) return;
    const wp = screenToWorld(canvas, e.clientX, e.clientY, vpInv);
    if (!wp) return;
    // Find nearest entity
    let nearest = state.entities[0],
      minDist = vec3.distance(wp, nearest.transform.worldPosition);
    for (let i = 1; i < state.entities.length; i++) {
      const d = vec3.distance(wp, state.entities[i].transform.worldPosition);
      if (d < minDist) {
        nearest = state.entities[i];
        minDist = d;
      }
    }
    loop.send("destroy", nearest.id);
  });

  // ── UI Overlay ───────────────────────────────────────────────
  const overlay = createOverlay(canvas, loop);

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (overlay) overlay.remove();
  };
}

/** Unproject screen coordinates to world space on y=0 plane */
function screenToWorld(canvas, clientX, clientY, vpInv) {
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  const near = vec3.create(ndcX, ndcY, -1);
  const far = vec3.create(ndcX, ndcY, 1);
  vec3.transformMat4(near, near, vpInv);
  vec3.transformMat4(far, far, vpInv);
  // Intersect the ray with y=0 plane
  const dir = vec3.subtract(vec3.create(), far, near);
  if (Math.abs(dir[1]) < 0.0001) return null;
  const t = -near[1] / dir[1];
  if (t < 0) return null;
  return vec3.add(vec3.create(), near, vec3.scale(dir, dir, t));
}

function createOverlay(canvas, loop) {
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    fontFamily: "monospace",
    zIndex: "10",
    userSelect: "none",
  });
  const label = document.createElement("span");
  label.style.cssText =
    "color:#fff;background:#0008;padding:4px 10px;border-radius:4px";
  loop.subscribe((s) => {
    label.textContent = `Entities: ${s.entities.length}`;
  });
  label.textContent = "Entities: 0";

  const hint = document.createElement("span");
  hint.style.cssText = "color:#aaa;font-size:11px;margin-left:8px";
  hint.textContent = "🖱️ click spawn · right-click destroy";

  div.append(label, hint);
  canvas.parentElement.appendChild(div);
  return div;
}

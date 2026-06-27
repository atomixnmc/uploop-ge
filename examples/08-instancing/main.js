/**
 * 08-instancing — Instanced rendering of 1000 cubes.
 *
 * State holds instance count and global rotation. Random offsets,
 * colors, and scales generated once per instance at init. All cubes
 * rendered in a single tight draw loop sharing one VAO. FPS counter
 * shows real-time performance. Demonstrates the uploop pattern for
 * high-volume rendering.
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, mat4 } from "@uploop/math";
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
  const cube = createCube(0.2);

  // VAO (stride=32: pos@0, uv@24)
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);
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

  // ── Instance data — generated once ───────────────────────────
  const COUNT = 1000;
  const offsets = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 4);
  const scales = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    // Spread in a spherical shell
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 4 + Math.random() * 3;
    offsets[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    offsets[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    offsets[i * 3 + 2] = Math.cos(phi) * r;

    colors[i * 4] = 0.3 + Math.random() * 0.7;
    colors[i * 4 + 1] = 0.2 + Math.random() * 0.6;
    colors[i * 4 + 2] = 0.4 + Math.random() * 0.6;
    colors[i * 4 + 3] = 1;

    scales[i] = 0.5 + Math.random() * 1.5;
  }

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
  mat4.lookAt(view, [0, 2, 10], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.04, 0.04, 0.1, 1);

  // ── Game Loop ────────────────────────────────────────────────
  const model = mat4.create();
  const rootRot = mat4.create();

  const loop = createGameLoop({
    state: { count: COUNT, rotation: 0 },

    update: {
      tick(s, dt) {
        return { rotation: s.rotation + dt * 0.3 };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      const rot = state.rotation + alpha * loop.fixedTimestep * 0.3;
      mat4.fromYRotation(rootRot, rot);

      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);

      // Draw all instances — tight loop, shared VAO
      for (let i = 0; i < state.count; i++) {
        // Position each cube in the shell, rotated by the world rotation
        const ox = offsets[i * 3];
        const oy = offsets[i * 3 + 1];
        const oz = offsets[i * 3 + 2];

        mat4.fromTranslation(model, [ox, oy, oz]);
        mat4.multiply(model, rootRot, model);
        mat4.scale(model, model, [scales[i], scales[i], scales[i]]);

        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
        gl.uniform4f(
          shader.uniforms.uColor.location,
          colors[i * 4],
          colors[i * 4 + 1],
          colors[i * 4 + 2],
          1,
        );
        gl.drawElements(gl.TRIANGLES, cube.indexCount, gl.UNSIGNED_SHORT, 0);
      }
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── FPS Overlay ──────────────────────────────────────────────
  const overlay = createOverlay(canvas, loop);

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (overlay) overlay.remove();
  };
}

function createOverlay(canvas, loop) {
  const div = document.createElement("span");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    color: "#0f0",
    background: "#0008",
    padding: "4px 10px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "13px",
    zIndex: "10",
    userSelect: "none",
  });
  canvas.parentElement.appendChild(div);

  let lastUpdate = 0;
  loop.subscribe(() => {
    const now = performance.now();
    if (now - lastUpdate > 300) {
      div.textContent = `Instances: 1000 | FPS: ${loop.fps}`;
      lastUpdate = now;
    }
  });
  div.textContent = "Instances: 1000 | FPS: --";
  return div;
}

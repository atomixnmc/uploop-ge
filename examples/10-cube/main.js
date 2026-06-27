/**
 * 10-cube — Rotating cube with Phong shading.
 *
 * State: { rotation, axis }. Update: tick rotates, toggleAxis cycles
 * X/Y/Z. Keyboard: press A to toggle axis. Simple 3D example
 * demonstrating the uploop pattern with Phong lighting.
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
    builtinShaders.phong.vertex,
    builtinShaders.phong.fragment,
  );
  const cube = createCube(1.2);

  // VAO (stride=32: pos@0, normal@12, uv@24)
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
  gl.enableVertexAttribArray(shader.attributes.aNormal.location);
  gl.vertexAttribPointer(
    shader.attributes.aNormal.location,
    3,
    gl.FLOAT,
    false,
    32,
    12,
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
  mat4.lookAt(view, [0, 1.5, 4], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.08, 0.08, 0.15, 1);

  // ── Game Loop ────────────────────────────────────────────────
  const model = mat4.create();
  const axes = ["x", "y", "z"];

  const loop = createGameLoop({
    state: { rotation: 0, axis: "y" },

    update: {
      /** Advance rotation each tick */
      tick(s, dt) {
        return { rotation: s.rotation + dt * 1.2 };
      },
      /** Cycle through rotation axes */
      toggleAxis(s) {
        const i = axes.indexOf(s.axis);
        return { axis: axes[(i + 1) % 3] };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      // Smooth interpolated rotation
      const rot = state.rotation + alpha * loop.fixedTimestep * 1.2;

      // Build rotation matrix from axis
      if (state.axis === "x") mat4.fromXRotation(model, rot);
      else if (state.axis === "y") mat4.fromYRotation(model, rot);
      else mat4.fromZRotation(model, rot);

      gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );

      // Phong lighting uniforms
      const eye = [0, 1.5, 4];
      gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
      gl.uniform3fv(
        shader.uniforms.uLightDirection.location,
        vec3.normalize(vec3.create(), [1, 2, 1]),
      );
      gl.uniform3fv(shader.uniforms.uLightColor.location, [1, 1, 1]);
      gl.uniform3fv(shader.uniforms.uAmbientColor.location, [0.1, 0.1, 0.15]);
      gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);
      gl.uniform1f(shader.uniforms.uSpecularStrength.location, 0.5);
      gl.uniform1f(shader.uniforms.uShininess.location, 32);
      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);
      gl.uniform4f(shader.uniforms.uColor.location, 0.3, 0.6, 1.0, 1); // blue cube
      gl.uniformMatrix3fv(
        shader.uniforms.uNormalMatrix.location,
        false,
        normalMatrix(model),
      );

      gl.drawElements(gl.TRIANGLES, cube.indexCount, gl.UNSIGNED_SHORT, 0);
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── Keyboard ─────────────────────────────────────────────────
  window.addEventListener("keydown", (e) => {
    if (e.key === "a" || e.key === "A") {
      loop.send("toggleAxis");
    }
  });

  // ── Overlay ──────────────────────────────────────────────────
  const overlay = createOverlay(canvas, loop);

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
    bottom: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    background: "#000c",
    padding: "6px 16px",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontSize: "13px",
    zIndex: "10",
    userSelect: "none",
    display: "flex",
    gap: "12px",
  });

  const axisEl = document.createElement("span");
  const hintEl = document.createElement("span");
  hintEl.style.cssText = "color:#888";
  hintEl.textContent = "Press A to toggle axis";
  div.append(axisEl, hintEl);
  canvas.parentElement.appendChild(div);

  loop.subscribe((s) => {
    axisEl.textContent = `Axis: ${s.axis.toUpperCase()}`;
  });
  axisEl.textContent = "Axis: Y";

  return div;
}

function normalMatrix(model) {
  const m = mat4.clone(model);
  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;
  mat4.invert(m, m);
  mat4.transpose(m, m);
  return new Float32Array([
    m[0],
    m[1],
    m[2],
    m[4],
    m[5],
    m[6],
    m[8],
    m[9],
    m[10],
  ]);
}

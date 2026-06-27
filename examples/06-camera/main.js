/**
 * 06-camera — Camera system through the loop.
 *
 * Orbit camera controlled by state. Mouse drag orbits, scroll zooms.
 * Each frame, lookAt + perspective are computed from camera state.
 * Renders a 3×3 grid of colored cubes. Demonstrates how camera
 * parameters in state drive the entire view declaratively.
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
  const cube = createCube(0.6);

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

  // ── Matrices ─────────────────────────────────────────────────
  const projection = mat4.create();
  const view = mat4.create();
  const model = mat4.create();

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.08, 0.08, 0.14, 1);

  // ── Cube grid data ───────────────────────────────────────────
  const grid = [];
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      grid.push({
        pos: [x * 2, 0, z * 2],
        color: [0.4 + x * 0.3, 0.3 + z * 0.3, 0.5 + (x + z) * 0.15],
      });
    }
  }

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: {
      camera: { theta: 0, phi: 0.7, distance: 7 },
    },

    update: {
      /** Orbit the camera */
      orbit(s, dtheta, dphi) {
        const c = { ...s.camera };
        c.theta += dtheta;
        c.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, c.phi + dphi));
        return { camera: c };
      },
      /** Zoom in / out */
      zoom(s, dd) {
        const c = { ...s.camera };
        c.distance = Math.max(2, Math.min(20, c.distance + dd));
        return { camera: c };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      // Compute camera from state each frame
      const { theta, phi, distance } = state.camera;
      const eye = [
        Math.sin(theta) * Math.cos(phi) * distance,
        Math.sin(phi) * distance,
        Math.cos(theta) * Math.cos(phi) * distance,
      ];
      mat4.lookAt(view, eye, [0, 0, 0], [0, 1, 0]);

      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);

      // Shared lighting
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

      for (const cell of grid) {
        mat4.fromTranslation(model, cell.pos);
        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
        gl.uniform4f(shader.uniforms.uColor.location, ...cell.color, 1);
        gl.uniformMatrix3fv(
          shader.uniforms.uNormalMatrix.location,
          false,
          normalMatrix(model),
        );
        gl.drawElements(gl.TRIANGLES, cube.indexCount, gl.UNSIGNED_SHORT, 0);
      }
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── Input ────────────────────────────────────────────────────
  let dragging = false,
    lastX = 0,
    lastY = 0;

  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = (e.clientX - lastX) * 0.005;
    const dy = (e.clientY - lastY) * 0.005;
    loop.send("orbit", dx, -dy);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      loop.send("zoom", e.deltaY * 0.01);
    },
    { passive: false },
  );

  console.log(
    "%c🔄 Camera example%c | drag to orbit · scroll to zoom · canvas._loop.describe()",
    "color:#4f8",
    "",
  );

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
  };
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

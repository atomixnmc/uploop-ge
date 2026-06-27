/**
 * 12-textured — Textured cube with procedural checkerboard.
 *
 * State: { rotation, pattern }. Texture generated via Canvas 2D at
 * init. Update: tick rotates cube, togglePattern switches between
 * checkerboard and stripes. Uses Phong shader with texture uniform.
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, mat4 } from "@uploop/math";
import { createCube } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Generate procedural textures ─────────────────────────────
  const SIZE = 256;
  const textures = {
    checker: createTexture(gl, (ctx) => {
      const grid = 8;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const cx = Math.floor(x / (SIZE / grid));
          const cy = Math.floor(y / (SIZE / grid));
          const v = (cx + cy) % 2 === 0 ? 0.9 : 0.2;
          ctx.fillStyle = `rgb(${v * 255},${v * 255},${v * 255})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }),
    stripes: createTexture(gl, (ctx) => {
      for (let y = 0; y < SIZE; y++) {
        const v = Math.sin(y * 0.2) * 0.4 + 0.5;
        const r = v * 200 + 55;
        const g = v * 100 + 55;
        const b = (1 - v) * 180 + 55;
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(0, y, SIZE, 1);
      }
    }),
  };

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
  mat4.lookAt(view, [0, 1, 4], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.1, 0.1, 0.16, 1);

  // ── Game Loop ────────────────────────────────────────────────
  const model = mat4.create();

  const loop = createGameLoop({
    state: { rotation: 0, pattern: "checker" },

    update: {
      /** Rotate cube */
      tick(s, dt) {
        return { rotation: s.rotation + dt * 0.8 };
      },
      /** Toggle between checker and stripes */
      togglePattern(s) {
        return { pattern: s.pattern === "checker" ? "stripes" : "checker" };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      const rot = state.rotation + alpha * loop.fixedTimestep * 0.8;
      mat4.fromYRotation(model, rot);

      gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );

      const eye = [0, 1, 4];
      gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
      gl.uniform3fv(
        shader.uniforms.uLightDirection.location,
        vec3.normalize(vec3.create(), [1, 2, 1]),
      );
      gl.uniform3fv(shader.uniforms.uLightColor.location, [1, 1, 1]);
      gl.uniform3fv(shader.uniforms.uAmbientColor.location, [0.15, 0.15, 0.2]);
      gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);
      gl.uniform1f(shader.uniforms.uSpecularStrength.location, 0.3);
      gl.uniform1f(shader.uniforms.uShininess.location, 16);
      gl.uniform4f(shader.uniforms.uColor.location, 1, 1, 1, 1);

      // Texture
      gl.uniform1i(shader.uniforms.uHasTexture.location, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[state.pattern]);
      gl.uniform1i(shader.uniforms.uTexture.location, 0);

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

  // ── Click to toggle ──────────────────────────────────────────
  canvas.addEventListener("click", () => loop.send("togglePattern"));

  // ── Overlay ──────────────────────────────────────────────────
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
    color: "#fff",
    background: "#0008",
    padding: "4px 10px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "13px",
    zIndex: "10",
    userSelect: "none",
  });
  canvas.parentElement.appendChild(div);
  loop.subscribe((s) => {
    div.textContent = `Texture: ${s.pattern} | 🖱️ click to toggle`;
  });
  div.textContent = "Texture: checker | 🖱️ click to toggle";
  return div;
}

function createTexture(gl, paint) {
  const c2d = document.createElement("canvas");
  c2d.width = c2d.height = 256;
  const ctx = c2d.getContext("2d");
  paint(ctx);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    256,
    256,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    c2d,
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
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

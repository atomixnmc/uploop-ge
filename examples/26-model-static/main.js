/**
 * 26-model-static — Static GLTF model viewer with orbit camera.
 *
 * Loads Khronos DamagedHelmet from the web, applies base-color texture,
 * and renders it with Phong shading. Orbit via mouse drag + scroll.
 *
 * State: { meshes, rotation, modelName, loaded, error }
 * Update: tick rotates model. Render: draw all primitives with Phong.
 */
import { createGameLoop } from "@uploop/scene";
import { mat4, mat3 } from "@uploop/math";
import { createProgram, builtinShaders } from "@uploop/shader";
import { loadModel, loadTexture } from "@uploop/loaders";

const MODEL_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb";
const TEX_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF/Default_albedo.jpg";

export function init(canvas) {
  // ── Loading overlay ────────────────────────────────────────────
  const loadingDiv = document.createElement("div");
  Object.assign(loadingDiv.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "monospace",
    fontSize: "18px",
    color: "#aaa",
    background: "#0a0a14",
    zIndex: "20",
    userSelect: "none",
  });
  loadingDiv.textContent = "Loading model...";
  canvas.parentElement.appendChild(loadingDiv);

  let _cleanupOne = null;

  // ── Async load then start ─────────────────────────────────────
  async function load() {
    try {
      const [model, texResult] = await Promise.all([
        loadModel(MODEL_URL),
        (async () => {
          // Need a temp WebGL context to load texture (reuse the canvas
          // afterwards, so we create a temp canvas for texture upload)
          const tmp = document.createElement("canvas");
          tmp.width = tmp.height = 1;
          const tgl = tmp.getContext("webgl2");
          if (!tgl) throw new Error("WebGL2 not available");
          return loadTexture(tgl, TEX_URL);
        })(),
      ]);

      // Now get the real WebGL context on the actual canvas
      const gl = canvas.getContext("webgl2");
      if (!gl) throw new Error("WebGL2 not available");

      // Re-upload texture to the real GL context (graceful fallback if fails)
      let texture = null;
      if (texResult) {
        try {
          texture = await loadTexture(gl, TEX_URL);
        } catch (texErr) {
          console.warn(
            "Texture load failed, using solid color:",
            texErr.message,
          );
        }
      }

      loadingDiv.remove();

      startViewer(canvas, gl, model, texture);
    } catch (e) {
      console.error("Model load failed:", e);
      loadingDiv.textContent = "⚠ Failed to load model";
      loadingDiv.style.color = "#f44";

      // Fallback: show error on 2D canvas
      const c2 = canvas.getContext("2d");
      if (c2) {
        canvas.width = 1280;
        canvas.height = 720;
        c2.fillStyle = "#0a0a14";
        c2.fillRect(0, 0, canvas.width, canvas.height);
        c2.fillStyle = "#f44";
        c2.font = "16px monospace";
        c2.textAlign = "center";
        c2.fillText(`Error: ${e.message}`, canvas.width / 2, canvas.height / 2);
        c2.fillStyle = "#888";
        c2.font = "12px monospace";
        c2.fillText(
          "Check console for details",
          canvas.width / 2,
          canvas.height / 2 + 24,
        );
      }
    }
  }

  function startViewer(canvas, gl, model, texResult) {
    // ── Shader ──────────────────────────────────────────────────
    const shader = createProgram(
      gl,
      builtinShaders.phong.vertex,
      builtinShaders.phong.fragment,
    );

    // ── Build VAOs for each mesh primitive ──────────────────────
    const primitives = [];
    for (const m of model.meshes) {
      const mesh = m.mesh;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      if (mesh.indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      }
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
      primitives.push({
        vao,
        indexCount: mesh.indexCount,
        name: m.name,
      });
    }

    // ── Texture ─────────────────────────────────────────────────
    const texture = texResult?.texture || null;

    // ── Responsive canvas (min 720p) ────────────────────────────
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

    // ── Orbit camera ────────────────────────────────────────────
    const projection = mat4.create();
    const view = mat4.create();
    let camAngle = -0.4,
      camPitch = 0.5,
      camDist = 3;
    let dragging = false,
      lastMX = 0,
      lastMY = 0;

    function updateProjection() {
      const aspect = canvas.width / canvas.height;
      mat4.perspective(projection, Math.PI / 4, aspect, 0.01, 100);
    }

    function updateCamera() {
      const eye = [
        Math.cos(camAngle) * Math.cos(camPitch) * camDist,
        Math.sin(camPitch) * camDist,
        Math.sin(camAngle) * Math.cos(camPitch) * camDist,
      ];
      mat4.lookAt(view, eye, [0, 0, 0], [0, 1, 0]);
      return eye;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.08, 0.08, 0.15, 1);
    resize();

    // ── Game Loop ───────────────────────────────────────────────
    const modelMat = mat4.create();

    const loop = createGameLoop({
      state: { rotation: 0, modelName: "DamagedHelmet" },

      update: {
        tick(s, dt) {
          return { ...s, rotation: s.rotation + dt * 0.6 };
        },
      },

      render(state, alpha) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.useProgram(shader.program);

        const rot = state.rotation + alpha * loop.fixedTimestep * 0.6;
        mat4.fromYRotation(modelMat, rot);
        // Scale model to visible size
        mat4.scale(modelMat, modelMat, 1.8);

        const eye = updateCamera();

        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, modelMat);
        gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
        gl.uniformMatrix4fv(
          shader.uniforms.uProjection.location,
          false,
          projection,
        );
        gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
        gl.uniform3fv(
          shader.uniforms.uLightDirection.location,
          [0.3, 0.7, 0.5],
        );
        gl.uniform3fv(shader.uniforms.uLightColor.location, [1.2, 1.1, 1]);
        gl.uniform3fv(
          shader.uniforms.uAmbientColor.location,
          [0.15, 0.15, 0.2],
        );
        gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);
        gl.uniform1f(shader.uniforms.uSpecularStrength.location, 0.4);
        gl.uniform1f(shader.uniforms.uShininess.location, 32);
        gl.uniform4f(shader.uniforms.uColor.location, 1, 1, 1, 1);

        if (texture) {
          gl.uniform1i(shader.uniforms.uHasTexture.location, 1);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(shader.uniforms.uTexture.location, 0);
        } else {
          gl.uniform1i(shader.uniforms.uHasTexture.location, 0);
        }

        // Compute normal matrix from model matrix
        const nm = mat3.create();
        mat3.normalFromMat4(nm, modelMat);
        gl.uniformMatrix3fv(shader.uniforms.uNormalMatrix.location, false, nm);

        for (const prim of primitives) {
          gl.bindVertexArray(prim.vao);
          gl.drawElements(gl.TRIANGLES, prim.indexCount, gl.UNSIGNED_SHORT, 0);
        }
      },
    });

    loop.start();
    canvas._loop = loop;

    // ── Mouse / scroll input ────────────────────────────────────
    canvas.addEventListener("mousedown", (e) => {
      dragging = true;
      lastMX = e.clientX;
      lastMY = e.clientY;
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      camAngle += (e.clientX - lastMX) * 0.005;
      camPitch = Math.max(
        -1.4,
        Math.min(1.4, camPitch + (e.clientY - lastMY) * 0.005),
      );
      lastMX = e.clientX;
      lastMY = e.clientY;
    });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      camDist = Math.max(0.8, Math.min(8, camDist + e.deltaY * 0.005));
    });

    // ── Overlay ─────────────────────────────────────────────────
    const overlay = createOverlay(canvas, loop);

    _cleanupOne = () => {
      loop.stop();
      if (overlay) overlay.remove();
    };
  }

  load();

  // ── Cleanup ───────────────────────────────────────────────────
  return () => {
    if (_cleanupOne) _cleanupOne();
    if (loadingDiv.parentElement) loadingDiv.remove();
  };
}

function createOverlay(canvas, loop) {
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: "10",
    userSelect: "none",
    display: "flex",
    gap: "8px",
  });

  const nameEl = document.createElement("span");
  nameEl.style.cssText =
    "color:#fff;background:#0008;padding:4px 10px;border-radius:4px";
  nameEl.textContent = "DamagedHelmet";

  const hintEl = document.createElement("span");
  hintEl.style.cssText =
    "color:#888;background:#0008;padding:4px 10px;border-radius:4px;font-size:11px";
  hintEl.textContent = "🖱️ drag orbit  ·  scroll zoom";

  div.append(nameEl, hintEl);
  canvas.parentElement.appendChild(div);
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

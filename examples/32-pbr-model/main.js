/**
 * 32-pbr-model — GLTF model with PBR (metallic-roughness) shading.
 *
 * Loads Khronos DamagedHelmet + a PBR material sphere grid for comparison.
 * Orbit camera, three light sources, metallic/roughness sliders for the grid.
 *
 * State: { rotation, metallic, roughness, modelLoaded }
 * Update: tick rotates model, slider handlers adjust PBR params
 * Render: draws helmet + 5×5 sphere grid, all with Cook-Torrance PBR
 */
import { createGameLoop } from "@uploop/scene";
import { mat4, vec3, vec4 } from "@uploop/math";
import { createSphere } from "@uploop/geometry";
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
  loadingDiv.textContent = "Loading GLTF model with PBR...";
  canvas.parentElement.appendChild(loadingDiv);

  let _cleanupOne = null;

  async function load() {
    try {
      const [model, texResult] = await Promise.all([
        loadModel(MODEL_URL),
        (async () => {
          const tmp = document.createElement("canvas");
          tmp.width = tmp.height = 1;
          const tgl = tmp.getContext("webgl2");
          if (!tgl) throw new Error("WebGL2 not available");
          return loadTexture(tgl, TEX_URL);
        })(),
      ]);

      const gl = canvas.getContext("webgl2");
      if (!gl) throw new Error("WebGL2 not available");

      let texture = null;
      if (texResult) {
        try {
          texture = await loadTexture(gl, TEX_URL);
        } catch (e) {
          console.warn("Texture load failed, using solid color:", e.message);
        }
      }

      loadingDiv.remove();
      startViewer(canvas, gl, model, texture);
    } catch (e) {
      console.error("Model load failed:", e);
      loadingDiv.textContent = "⚠ Failed to load model";
      loadingDiv.style.color = "#f44";
      const c2 = canvas.getContext("2d");
      if (c2) {
        canvas.width = 1280;
        canvas.height = 720;
        c2.fillStyle = "#0a0a14";
        c2.fillRect(0, 0, 1280, 720);
        c2.fillStyle = "#f44";
        c2.font = "16px monospace";
        c2.textAlign = "center";
        c2.fillText(`Error: ${e.message}`, 640, 360);
      }
    }
  }

  function startViewer(canvas, gl, model, texture) {
    // ═══════════════════════════════════════════════════════════════
    // PBR Shader
    // ═══════════════════════════════════════════════════════════════
    const shader = createProgram(
      gl,
      builtinShaders.pbr.vertex,
      builtinShaders.pbr.fragment,
    );

    // ═══════════════════════════════════════════════════════════════
    // Model VAOs (helmet primitives)
    // ═══════════════════════════════════════════════════════════════
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
      primitives.push({ vao, indexCount: mesh.indexCount, name: m.name });
    }

    // ═══════════════════════════════════════════════════════════════
    // PBR Sphere Grid VAO (for material comparison)
    // ═══════════════════════════════════════════════════════════════
    const sphereMesh = createSphere(0.3, 32, 16);
    const sphereVAO = gl.createVertexArray();
    gl.bindVertexArray(sphereVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, sphereMesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereMesh.indices, gl.STATIC_DRAW);
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

    // ═══════════════════════════════════════════════════════════════
    // Responsive canvas
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // Orbit camera
    // ═══════════════════════════════════════════════════════════════
    const projection = mat4.create(),
      view = mat4.create();
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

    // ═══════════════════════════════════════════════════════════════
    // PBR material grid data
    // ═══════════════════════════════════════════════════════════════
    const GRID = 5;
    const roughnessValues = [];
    const metallicValues = [];
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        roughnessValues.push(x / (GRID - 1));
        metallicValues.push(y / (GRID - 1));
      }

    // ═══════════════════════════════════════════════════════════════
    // Three-point lighting
    // ═══════════════════════════════════════════════════════════════
    const lights = {
      key: { dir: [0.4, 0.7, 0.5], color: [1.5, 1.4, 1.3] },
      fill: { dir: [-0.6, 0.2, -0.3], color: [0.3, 0.4, 0.6] },
      rim: { dir: [0.0, -0.2, -0.9], color: [0.6, 0.5, 0.7] },
    };

    // ═══════════════════════════════════════════════════════════════
    // Game Loop
    // ═══════════════════════════════════════════════════════════════
    const modelMat = mat4.create();
    const sphereMat = mat4.create();

    function normalMatrix(m) {
      const o = mat4.clone(m);
      o[12] = o[13] = o[14] = 0;
      o[15] = 1;
      mat4.invert(o, o);
      mat4.transpose(o, o);
      return new Float32Array([
        o[0],
        o[1],
        o[2],
        o[4],
        o[5],
        o[6],
        o[8],
        o[9],
        o[10],
      ]);
    }

    const loop = createGameLoop({
      state: {
        rotation: 0,
        modelName: "DamagedHelmet",
        metallicOverride: 0.0,
        roughnessOverride: 0.5,
        showGrid: true,
      },

      update: {
        tick(s, dt) {
          return { ...s, rotation: s.rotation + dt * 0.4 };
        },
      },

      render(state, alpha) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(shader.program);

        const rot = state.rotation + alpha * loop.fixedTimestep * 0.4;
        const eye = updateCamera();

        // Shared camera/light uniforms (wrap in Float32Array for WebGL compat)
        gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
        gl.uniformMatrix4fv(
          shader.uniforms.uProjection.location,
          false,
          projection,
        );
        gl.uniform3fv(
          shader.uniforms.uCameraPosition.location,
          Float32Array.from(eye),
        );
        gl.uniform3fv(
          shader.uniforms.uAmbientColor.location,
          new Float32Array([0.15, 0.15, 0.2]),
        );
        gl.uniform3f(shader.uniforms.uBaseColor.location, 0.9, 0.85, 0.7);
        gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1.0);
        gl.uniform1i(shader.uniforms.uHasMRMap.location, 0);

        // ── Draw each light as additive pass ─────────────────────
        function setLight(lightDir, lightColor) {
          const d = vec3.normalize(vec3.create(), lightDir);
          gl.uniform3fv(shader.uniforms.uLightDirection.location, d);
          gl.uniform3fv(
            shader.uniforms.uLightColor.location,
            Float32Array.from(lightColor),
          );
        }

        function drawWithPBR(vao, indexCount, useTexture, metallic, roughness) {
          gl.bindVertexArray(vao);
          gl.uniform1i(
            shader.uniforms.uHasTexture.location,
            useTexture ? 1 : 0,
          );
          if (useTexture && texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(shader.uniforms.uTexture.location, 0);
          }
          gl.uniform1f(shader.uniforms.uMetallic.location, metallic);
          gl.uniform1f(shader.uniforms.uRoughness.location, roughness);
          gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        }

        // ── Draw helmet (center, rotating) ──────────────────────
        {
          mat4.fromYRotation(modelMat, rot);
          mat4.scale(modelMat, modelMat, 1.8);
          gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, modelMat);
          gl.uniformMatrix3fv(
            shader.uniforms.uNormalMatrix.location,
            false,
            normalMatrix(modelMat),
          );

          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          for (const lightName of ["key", "fill", "rim"]) {
            const l = lights[lightName];
            setLight(l.dir, l.color);

            // Enable blending for additive light passes (except first)
            if (lightName !== "key") {
              gl.enable(gl.BLEND);
              gl.blendFunc(gl.ONE, gl.ONE);
              gl.depthMask(false);
              gl.depthFunc(gl.LEQUAL);
            }

            for (const prim of primitives) {
              // Helmet: metallic paint, moderate roughness
              drawWithPBR(prim.vao, prim.indexCount, true, 0.15, 0.4);
            }

            if (lightName !== "key") {
              gl.disable(gl.BLEND);
              gl.depthMask(true);
              gl.depthFunc(gl.LESS);
            }
          }
        }

        // ── Draw PBR reference grid (right side, if enabled) ────
        if (state.showGrid) {
          const sp = 1.0,
            gridOff = ((GRID - 1) * sp) / 2;
          for (let i = 0; i < GRID * GRID; i++) {
            const gx = i % GRID,
              gy = Math.floor(i / GRID);
            mat4.fromTranslation(sphereMat, [
              gx * sp - gridOff + 3.5,
              gy * sp - gridOff,
              0,
            ]);
            gl.uniformMatrix4fv(
              shader.uniforms.uModel.location,
              false,
              sphereMat,
            );
            gl.uniformMatrix3fv(
              shader.uniforms.uNormalMatrix.location,
              false,
              normalMatrix(sphereMat),
            );

            // Single light for grid
            setLight(lights.key.dir, lights.key.color);

            drawWithPBR(
              sphereVAO,
              sphereMesh.indexCount,
              false,
              metallicValues[i],
              roughnessValues[i],
            );
          }
        }

        updateOverlay();
      },
    });

    loop.start();
    canvas._loop = loop;

    // ═══════════════════════════════════════════════════════════════
    // Mouse / scroll input
    // ═══════════════════════════════════════════════════════════════
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
      camDist = Math.max(1.5, Math.min(10, camDist + e.deltaY * 0.005));
    });
    // Keyboard toggle for grid
    window.addEventListener("keydown", (e) => {
      if (e.key === "g" || e.key === "G") {
        const s = loop.getState();
        loop.setState({ showGrid: !s.showGrid });
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // PBR sliders overlay (HTML range inputs)
    // ═══════════════════════════════════════════════════════════════
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "absolute",
      bottom: "8px",
      left: "8px",
      fontFamily: "monospace",
      fontSize: "12px",
      zIndex: "10",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      background: "#0008",
      padding: "8px 12px",
      borderRadius: "6px",
      userSelect: "none",
    });

    function makeSlider(label, min, max, step, initial, onChange) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px";
      const lbl = document.createElement("span");
      lbl.style.cssText = "color:#aaa;width:80px;font-size:11px";
      lbl.textContent = label;
      const val = document.createElement("span");
      val.style.cssText =
        "color:#fff;width:32px;text-align:right;font-size:11px";
      val.textContent = initial.toFixed(2);
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = initial;
      slider.style.cssText = "width:100px;accent-color:#48a";
      slider.addEventListener("input", () => {
        val.textContent = parseFloat(slider.value).toFixed(2);
        onChange(parseFloat(slider.value));
      });
      row.append(lbl, slider, val);
      return row;
    }

    panel.appendChild(
      makeSlider("Metallic", "0", "1", "0.01", 0.15, (v) => {
        loop.setState({ metallicOverride: v });
      }),
    );
    panel.appendChild(
      makeSlider("Roughness", "0", "1", "0.01", 0.4, (v) => {
        loop.setState({ roughnessOverride: v });
      }),
    );
    canvas.parentElement.appendChild(panel);

    // ── Bottom-right hint ────────────────────────────────────────
    const hint = document.createElement("div");
    Object.assign(hint.style, {
      position: "absolute",
      bottom: "8px",
      right: "8px",
      fontFamily: "monospace",
      fontSize: "11px",
      zIndex: "10",
      color: "#888",
      background: "#0008",
      padding: "4px 10px",
      borderRadius: "4px",
      userSelect: "none",
    });
    hint.textContent = "🖱️ drag orbit  ·  scroll zoom  ·  G toggle grid";
    canvas.parentElement.appendChild(hint);

    // ── FPS display (top-left) ───────────────────────────────────
    const fpsEl = document.createElement("div");
    Object.assign(fpsEl.style, {
      position: "absolute",
      top: "8px",
      right: "8px",
      fontFamily: "monospace",
      fontSize: "12px",
      zIndex: "10",
      color: "#6cf",
      background: "#0008",
      padding: "4px 10px",
      borderRadius: "4px",
      userSelect: "none",
    });
    canvas.parentElement.appendChild(fpsEl);

    function updateOverlay() {
      fpsEl.textContent = `FPS: ${loop.fps}`;
    }

    _cleanupOne = () => {
      loop.stop();
      panel.remove();
      hint.remove();
      fpsEl.remove();
    };
  }

  load();

  return () => {
    if (_cleanupOne) _cleanupOne();
    if (loadingDiv.parentElement) loadingDiv.remove();
  };
}

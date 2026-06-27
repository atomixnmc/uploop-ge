/**
 * 27-model-animated — GLTF skeletal animation playback.
 *
 * Loads a skinned GLTF model, parses animation channels, and evaluates
 * keyframes at the current time. Click canvas to play/pause. Loops.
 * Falls back to a procedural box character if model load fails.
 *
 * State: { nodes, meshes, animations, time, playing, fallback }
 * Update: tick advances time, evaluates channels. Render: draws hierarchy.
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, quat, mat4 } from "@uploop/math";
import { createCube } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";
import { loadModel } from "@uploop/loaders";

const MODEL_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SimpleSkin/glTF/SimpleSkin.gltf";

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
  loadingDiv.textContent = "Loading animated model...";
  canvas.parentElement.appendChild(loadingDiv);

  let _cleanupOne = null;

  async function load() {
    try {
      const model = await loadModel(MODEL_URL);

      if (!model.animations?.length) {
        throw new Error("No animations found in model");
      }

      const gl = canvas.getContext("webgl2");
      if (!gl) throw new Error("WebGL2 not available");

      loadingDiv.remove();
      startViewer(canvas, gl, model, false);
    } catch (e) {
      console.warn("Animated model load failed, using procedural fallback:", e);
      loadingDiv.remove();

      const gl = canvas.getContext("webgl2");
      if (!gl) {
        const c2 = canvas.getContext("2d");
        if (c2) {
          c2.fillStyle = "#0a0a14";
          c2.fillRect(0, 0, 1280, 720);
          c2.fillStyle = "#f44";
          c2.font = "16px monospace";
          c2.textAlign = "center";
          c2.fillText("WebGL2 not available", 640, 360);
        }
        return;
      }
      startViewer(canvas, gl, null, true);
    }
  }

  function startViewer(canvas, gl, model, fallback) {
    // ── Shader ──────────────────────────────────────────────────
    const shader = createProgram(
      gl,
      builtinShaders.phong.vertex,
      builtinShaders.phong.fragment,
    );

    let nodes = [];
    let meshes = [];
    let channels = [];
    let duration = 1;

    if (!fallback && model) {
      // ── Copy node data from GLTF ──────────────────────────────
      nodes = (model.nodes || []).map((n) => ({
        name: n.name,
        meshIndex: n.meshIndex,
        children: [...(n.children || [])],
        translation: vec3.clone(n.translation || vec3.create()),
        rotation: n.rotation
          ? new Float32Array([
              n.rotation[0],
              n.rotation[1],
              n.rotation[2],
              n.rotation[3],
            ])
          : quat.clone(quat.create()),
        scale: vec3.clone(n.scale || vec3.set(vec3.create(), 1, 1, 1)),
        worldMatrix: mat4.create(),
      }));

      // ── Build VAOs ────────────────────────────────────────────
      meshes = (model.meshes || []).map((m) => {
        const mesh = m.mesh;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
        if (mesh.indices) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
          gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            mesh.indices,
            gl.STATIC_DRAW,
          );
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
        return { vao, indexCount: mesh.indexCount };
      });

      // ── Parse animation channels ──────────────────────────────
      for (const anim of model.animations || []) {
        for (const ch of anim.channels || []) {
          channels.push({
            targetNode: ch.targetNode,
            targetPath: ch.targetPath,
            times: ch.times,
            values: ch.values,
          });
          if (ch.times?.length) {
            duration = Math.max(duration, ch.times[ch.times.length - 1]);
          }
        }
      }
    }

    if (fallback) {
      duration = 2;
    }

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

    // ── Camera ──────────────────────────────────────────────────
    const projection = mat4.create();
    const view = mat4.create();
    let camAngle = -0.3,
      camPitch = 0.4,
      camDist = 5;
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
        Math.sin(camPitch) * camDist + 1.5,
        Math.sin(camAngle) * Math.cos(camPitch) * camDist,
      ];
      mat4.lookAt(view, eye, [0, 1, 0], [0, 1, 0]);
      return eye;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.08, 0.08, 0.15, 1);
    resize();

    // ── Fallback: procedural box character ──────────────────────
    let fallbackCube = null,
      fallbackVAO = null;
    if (fallback) {
      fallbackCube = createCube(1);
      fallbackVAO = gl.createVertexArray();
      gl.bindVertexArray(fallbackVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(
        gl.ARRAY_BUFFER,
        fallbackCube.vertices,
        gl.STATIC_DRAW,
      );
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        fallbackCube.indices,
        gl.STATIC_DRAW,
      );
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
    }

    // ── Keyframe evaluation helpers ─────────────────────────────
    function lerpKeys(times, values, stride, t) {
      if (!times || times.length === 0) return new Float32Array(stride);
      if (t <= times[0])
        return new Float32Array(values.subarray(0, stride));
      if (t >= times[times.length - 1])
        return new Float32Array(
          values.subarray((times.length - 1) * stride, times.length * stride),
        );

      let lo = 0,
        hi = times.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= t) lo = mid;
        else hi = mid;
      }
      const alpha =
        (t - times[lo]) / Math.max(0.0001, times[hi] - times[lo]);
      const out = new Float32Array(stride);
      for (let i = 0; i < stride; i++) {
        out[i] =
          values[lo * stride + i] * (1 - alpha) +
          values[hi * stride + i] * alpha;
      }
      return out;
    }

    function evaluateChannels(nodesArr, time) {
      for (const ch of channels) {
        const node = nodesArr[ch.targetNode];
        if (!node) continue;

        const stride =
          ch.targetPath === "translation"
            ? 3
            : ch.targetPath === "rotation"
              ? 4
              : 3;
        const val = lerpKeys(ch.times, ch.values, stride, time);

        if (ch.targetPath === "translation") {
          vec3.set(node.translation, val[0], val[1], val[2]);
        } else if (ch.targetPath === "rotation") {
          quat.set(node.rotation, val[0], val[1], val[2], val[3]);
        } else if (ch.targetPath === "scale") {
          vec3.set(node.scale, val[0], val[1], val[2]);
        }
      }
    }

    function computeWorldMatrices(nodesArr) {
      function walk(idx, parentMatrix) {
        const n = nodesArr[idx];
        if (!n) return;
        const local = mat4.create();
        mat4.fromRotationTranslationScaleOrigin(
          local,
          n.rotation,
          n.translation,
          n.scale,
        );
        mat4.multiply(n.worldMatrix, parentMatrix, local);
        for (const childIdx of n.children) {
          walk(childIdx, n.worldMatrix);
        }
      }
      // Find root nodes (those not referenced as children)
      const childSet = new Set();
      for (const n of nodesArr) {
        for (const c of n.children) childSet.add(c);
      }
      for (let i = 0; i < nodesArr.length; i++) {
        if (!childSet.has(i)) walk(i, mat4.create());
      }
    }

    // ── Fallback draw helpers ───────────────────────────────────
    function drawCubePart(parentWorld, localPos, ax, sx, sy, sz, color) {
      const m = mat4.create();
      mat4.copy(m, parentWorld);
      m[12] += localPos[0];
      m[13] += localPos[1];
      m[14] += localPos[2];

      if (ax !== 0) {
        const rx = mat4.create();
        mat4.fromXRotation(rx, ax);
        mat4.multiply(m, m, rx);
      }

      mat4.scale(m, m, [sx, sy, sz]);

      gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, m);
      gl.uniformMatrix3fv(
        shader.uniforms.uNormalMatrix.location,
        false,
        normalMatrix(m),
      );
      gl.uniform4f(shader.uniforms.uColor.location, ...color, 1);
      gl.drawElements(
        gl.TRIANGLES,
        fallbackCube.indexCount,
        gl.UNSIGNED_SHORT,
        0,
      );
    }

    function drawFallbackCharacter(time) {
      const phase = time * 3;
      const armAngle = Math.sin(phase) * 0.6;
      const bob = Math.sin(phase * 1.2) * 0.15;

      const bodyWorld = mat4.create();
      mat4.fromTranslation(bodyWorld, [0, bob + 1.0, 0]);

      // Body
      drawCubePart(bodyWorld, [0, 0, 0], 0, 0.5, 0.6, 0.3, [0.3, 0.6, 1]);
      // Head
      drawCubePart(bodyWorld, [0, 0.45, 0], 0, 0.4, 0.4, 0.4, [0.95, 0.85, 0.7]);
      // Arms
      drawCubePart(bodyWorld, [0.35, 0.1, 0], armAngle, 0.15, 0.4, 0.15, [0.25, 0.55, 0.9]);
      drawCubePart(bodyWorld, [-0.35, 0.1, 0], -armAngle, 0.15, 0.4, 0.15, [0.25, 0.55, 0.9]);
      // Legs
      const legAngle = Math.sin(phase) * 0.5;
      drawCubePart(bodyWorld, [0.12, -0.35, 0], legAngle, 0.15, 0.35, 0.15, [0.2, 0.25, 0.45]);
      drawCubePart(bodyWorld, [-0.12, -0.35, 0], -legAngle, 0.15, 0.35, 0.15, [0.2, 0.25, 0.45]);
    }

    // ── Game Loop ───────────────────────────────────────────────
    const loop = createGameLoop({
      state: { time: 0, playing: true, duration, fallback },

      update: {
        tick(s, dt) {
          if (!s.playing) return s;
          const t = (s.time + dt) % s.duration;
          return { ...s, time: t };
        },
        togglePlay(s) {
          return { playing: !s.playing };
        },
      },

      render(state, alpha) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(shader.program);

        const t = state.playing
          ? state.time + alpha * loop.fixedTimestep
          : state.time;

        const eye = updateCamera();

        gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
        gl.uniformMatrix4fv(
          shader.uniforms.uProjection.location,
          false,
          projection,
        );
        gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
        gl.uniform3fv(
          shader.uniforms.uLightDirection.location,
          [0.4, 0.8, 0.4],
        );
        gl.uniform3fv(shader.uniforms.uLightColor.location, [1.2, 1.1, 1]);
        gl.uniform3fv(
          shader.uniforms.uAmbientColor.location,
          [0.15, 0.15, 0.2],
        );
        gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);
        gl.uniform1f(shader.uniforms.uSpecularStrength.location, 0.3);
        gl.uniform1f(shader.uniforms.uShininess.location, 16);
        gl.uniform1i(shader.uniforms.uHasTexture.location, 0);

        if (state.fallback) {
          gl.bindVertexArray(fallbackVAO);
          drawFallbackCharacter(t);
        } else {
          // Evaluate animation at current time
          evaluateChannels(nodes, t);
          computeWorldMatrices(nodes);

          // Draw all meshes through node hierarchy
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.meshIndex == null || n.meshIndex >= meshes.length)
              continue;
            const prim = meshes[n.meshIndex];

            gl.uniformMatrix4fv(
              shader.uniforms.uModel.location,
              false,
              n.worldMatrix,
            );
            gl.uniformMatrix3fv(
              shader.uniforms.uNormalMatrix.location,
              false,
              normalMatrix(n.worldMatrix),
            );
            gl.uniform4f(shader.uniforms.uColor.location, 0.7, 0.6, 0.5, 1);

            gl.bindVertexArray(prim.vao);
            gl.drawElements(
              gl.TRIANGLES,
              prim.indexCount,
              gl.UNSIGNED_SHORT,
              0,
            );
          }
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
      camDist = Math.max(1, Math.min(12, camDist + e.deltaY * 0.01));
    });

    // ── Click to play/pause ─────────────────────────────────────
    canvas.addEventListener("click", () => loop.send("togglePlay"));

    // ── Overlay ─────────────────────────────────────────────────
    const overlay = createOverlay(canvas, loop, fallback);

    _cleanupOne = () => {
      loop.stop();
      if (overlay) overlay.remove();
    };
  }

  load();

  return () => {
    if (_cleanupOne) _cleanupOne();
    if (loadingDiv.parentElement) loadingDiv.remove();
  };
}

function createOverlay(canvas, loop, isFallback) {
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

  const timeEl = document.createElement("span");
  timeEl.style.cssText =
    "color:#fff;background:#0008;padding:4px 10px;border-radius:4px";
  timeEl.textContent = "Time: 0.00s";

  const statusEl = document.createElement("span");
  statusEl.style.cssText =
    "color:#4d4;background:#0008;padding:4px 10px;border-radius:4px";
  statusEl.textContent = "▶ Playing";

  const hintEl = document.createElement("span");
  hintEl.style.cssText =
    "color:#888;background:#0008;padding:4px 10px;border-radius:4px;font-size:11px";
  hintEl.textContent = isFallback
    ? "⚠ Fallback  ·  🖱️ click play/pause  ·  drag orbit"
    : "🖱️ click play/pause  ·  drag orbit  ·  scroll zoom";

  div.append(timeEl, statusEl, hintEl);
  canvas.parentElement.appendChild(div);

  loop.subscribe((s) => {
    timeEl.textContent = `Time: ${s.time.toFixed(2)}s`;
    statusEl.textContent = s.playing ? "▶ Playing" : "⏸ Paused";
    statusEl.style.color = s.playing ? "#4d4" : "#f84";
  });

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

/**
 * 05-materials — Declarative material switching via state.
 *
 * PBR sphere with UI sliders for roughness, metallic, and base color.
 * State drives rendering declaratively — material params live in state
 * and render reads them each frame. Demonstrates the uploop pattern:
 * state → update → render.
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, mat4 } from "@uploop/math";
import { createSphere } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Shader & Mesh ────────────────────────────────────────────
  const shader = createProgram(
    gl,
    builtinShaders.pbr.vertex,
    builtinShaders.pbr.fragment,
  );
  const sphere = createSphere(1, 48, 24);

  // VAO (stride=32: pos@0, normal@12, uv@24)
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
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
  mat4.lookAt(view, [0, 1.2, 3.5], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.12, 0.12, 0.18, 1);
  resize();

  // ── Game Loop ────────────────────────────────────────────────
  const model = mat4.create();

  const loop = createGameLoop({
    state: {
      roughness: 0.5,
      metallic: 0.0,
      color: [1.0, 0.5, 0.2], // orange base color
    },

    update: {
      /** Set roughness from UI slider */
      setRoughness(s, v) {
        return { roughness: v };
      },
      /** Set metallic from UI slider */
      setMetallic(s, v) {
        return { metallic: v };
      },
      /** Set base color from UI picker */
      setColor(s, r, g, b) {
        return { color: [r, g, b] };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      // Camera
      const eye = [0, 1.2, 3.5];
      gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
      gl.uniformMatrix3fv(
        shader.uniforms.uNormalMatrix.location,
        false,
        Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]),
      );

      // Material — driven entirely by state
      gl.uniform1f(shader.uniforms.uRoughness.location, state.roughness);
      gl.uniform1f(shader.uniforms.uMetallic.location, state.metallic);
      gl.uniform3fv(shader.uniforms.uBaseColor.location, state.color);
      gl.uniform4f(shader.uniforms.uColor.location, ...state.color, 1);

      // Lighting
      gl.uniform3fv(
        shader.uniforms.uLightDirection.location,
        vec3.normalize(vec3.create(), [1, 2, 0.5]),
      );
      gl.uniform3fv(shader.uniforms.uLightColor.location, [1, 1, 1]);
      gl.uniform3fv(shader.uniforms.uAmbientColor.location, [0.15, 0.15, 0.2]);

      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);
      gl.uniform1i(shader.uniforms.uHasMRMap.location, 0);

      gl.drawElements(gl.TRIANGLES, sphere.indexCount, gl.UNSIGNED_SHORT, 0);
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── UI Overlay ───────────────────────────────────────────────
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
    bottom: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#000c",
    color: "#fff",
    fontFamily: "monospace",
    fontSize: "13px",
    padding: "16px 20px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: "10",
    userSelect: "none",
    minWidth: "280px",
  });

  // Roughness slider
  const rLabel = label("Roughness");
  const rSlider = slider(0, 1, 0.5, 0.01, (v) => loop.send("setRoughness", v));
  const rVal = valueSpan("0.50");
  const rRow = row(rLabel, rSlider, rVal);

  // Metallic slider
  const mLabel = label("Metallic");
  const mSlider = slider(0, 1, 0, 0.01, (v) => loop.send("setMetallic", v));
  const mVal = valueSpan("0.00");
  const mRow = row(mLabel, mSlider, mVal);

  // Color picker
  const cLabel = label("Color");
  const cPicker = document.createElement("input");
  cPicker.type = "color";
  cPicker.value = "#ff8033";
  cPicker.style.cssText =
    "width:32px;height:24px;border:none;cursor:pointer;background:none";
  cPicker.addEventListener("input", () => {
    const hex = cPicker.value;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    loop.send("setColor", r, g, b);
  });
  const cRow = row(cLabel, cPicker);

  div.append(rRow, mRow, cRow);
  canvas.parentElement.appendChild(div);

  // Keep displayed values in sync
  loop.subscribe((s) => {
    rVal.textContent = s.roughness.toFixed(2);
    mVal.textContent = s.metallic.toFixed(2);
  });

  return div;
}

function label(text) {
  const el = document.createElement("span");
  el.textContent = text;
  el.style.cssText = "width:80px;text-align:right";
  return el;
}

function valueSpan(text) {
  const el = document.createElement("span");
  el.textContent = text;
  el.style.cssText = "width:40px;text-align:left";
  return el;
}

function slider(min, max, val, step, onChange) {
  const el = document.createElement("input");
  el.type = "range";
  el.min = min;
  el.max = max;
  el.value = val;
  el.step = step;
  el.style.cssText = "flex:1";
  el.addEventListener("input", () => onChange(parseFloat(el.value)));
  return el;
}

function row(...children) {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;gap:8px";
  el.append(...children);
  return el;
}

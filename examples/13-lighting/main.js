/**
 * 13-lighting — Multi-light scene with ambient, directional, and point lights.
 *
 * State: { lights: [...], objects: [...], pointAngle: 0 }.
 * Scene: plane + 3 spheres under 3 light types.
 * Directional light (sun), point light (orbiting), ambient (global).
 * Shows how lighting state drives the entire scene render.
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, mat4 } from "@uploop/math";
import { createSphere, createPlane } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Shader & Meshes ──────────────────────────────────────────
  const shader = createProgram(
    gl,
    builtinShaders.phong.vertex,
    builtinShaders.phong.fragment,
  );
  const sphere = createSphere(0.5, 32, 16);
  const plane = createPlane(10, 10, 2, 2);

  // ── Shared VAO setup ────────────────────────────────────────
  function createVAO(mesh) {
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
  }

  const sphereVAO = createVAO(sphere);
  const planeVAO = createVAO(plane);

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
  mat4.lookAt(view, [0, 3.5, 8], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.04, 0.04, 0.08, 1);

  // ── Lights (in state) ────────────────────────────────────────
  const lights = [
    { type: "ambient", color: [0.08, 0.08, 0.12] },
    {
      type: "directional",
      direction: [0.4, -0.8, 0.3],
      color: [1, 0.95, 0.8],
      intensity: 1,
    },
    {
      type: "point",
      position: [0, 1.5, 0],
      color: [1, 0.4, 0.2],
      intensity: 2,
      range: 6,
    },
  ];

  // ── Scene objects ────────────────────────────────────────────
  const objects = [
    {
      mesh: planeVAO,
      pos: [0, -1.5, 0],
      scale: [1, 1, 1],
      color: [0.25, 0.28, 0.35],
    },
    {
      mesh: sphereVAO,
      pos: [-2, 0, 0],
      scale: [1, 1, 1],
      color: [0.8, 0.25, 0.25],
    },
    {
      mesh: sphereVAO,
      pos: [0, 0.5, -1],
      scale: [0.7, 0.7, 0.7],
      color: [0.25, 0.7, 0.3],
    },
    {
      mesh: sphereVAO,
      pos: [2, 0, 1],
      scale: [0.8, 0.8, 0.8],
      color: [0.25, 0.35, 0.9],
    },
  ];

  // ── Game Loop ────────────────────────────────────────────────
  const model = mat4.create();

  const loop = createGameLoop({
    state: { lights, objects, pointAngle: 0 },

    update: {
      /** Orbit the point light */
      tick(s, dt) {
        const angle = s.pointAngle + dt * 1.2;
        const px = Math.cos(angle) * 2.5;
        const pz = Math.sin(angle) * 2.5;
        const newLights = s.lights.map((l) => {
          if (l.type === "point") {
            return { ...l, position: [px, 1.5, pz] };
          }
          return l;
        });
        return { lights: newLights, pointAngle: angle };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      const eye = [0, 3.5, 8];

      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);
      gl.uniform1f(shader.uniforms.uShininess.location, 32);

      // Extract light data from state
      const ambient = state.lights.find((l) => l.type === "ambient") || {
        color: [0.1, 0.1, 0.15],
      };
      const dir = state.lights.find((l) => l.type === "directional") || {
        color: [1, 1, 1],
        direction: [0, -1, 0],
        intensity: 1,
      };
      const point = state.lights.find((l) => l.type === "point") || {
        color: [1, 1, 1],
        position: [0, 1, 0],
        intensity: 1,
      };

      // Global ambient
      gl.uniform3fv(shader.uniforms.uAmbientColor.location, ambient.color);
      gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);

      for (const obj of state.objects) {
        mat4.fromTranslation(model, obj.pos);
        mat4.scale(model, model, obj.scale);

        gl.bindVertexArray(obj.mesh.vao);
        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
        gl.uniform4f(shader.uniforms.uColor.location, ...obj.color, 1);
        gl.uniformMatrix3fv(
          shader.uniforms.uNormalMatrix.location,
          false,
          normalMatrix(model),
        );

        // Combine directional + point light for each object
        // Directional light
        const dirNorm = vec3.normalize(vec3.create(), dir.direction);

        // Point light falloff
        const toLight = vec3.subtract(vec3.create(), point.position, obj.pos);
        const dist = vec3.length(toLight);
        const attenuation =
          point.intensity / (1 + 0.1 * dist + 0.02 * dist * dist);

        // Blend: directional provides base, point adds local
        const blendedColor = [
          dir.color[0] + point.color[0] * attenuation,
          dir.color[1] + point.color[1] * attenuation,
          dir.color[2] + point.color[2] * attenuation,
        ];

        gl.uniform3fv(shader.uniforms.uLightColor.location, blendedColor);

        // Direction as primary light direction
        gl.uniform3fv(shader.uniforms.uLightDirection.location, dirNorm);

        // Specular from blended light
        const specStr = 0.3 + attenuation * 0.4;
        gl.uniform1f(
          shader.uniforms.uSpecularStrength.location,
          Math.min(specStr, 0.8),
        );

        gl.drawElements(
          gl.TRIANGLES,
          obj.mesh.indexCount,
          gl.UNSIGNED_SHORT,
          0,
        );
      }
    },
  });

  loop.start();
  canvas._loop = loop;

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
    bottom: "8px",
    left: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: "10",
    userSelect: "none",
  });

  const items = [
    { label: "🌙 Ambient", color: "#888" },
    { label: "☀️ Directional", color: "#fda" },
    { label: "💡 Point", color: "#f84" },
  ];

  for (const item of items) {
    const el = document.createElement("span");
    el.style.cssText = `color:#fff;background:#0008;padding:2px 8px;border-radius:3px;border-left:3px solid ${item.color}`;
    el.textContent = item.label;
    div.appendChild(el);
  }

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

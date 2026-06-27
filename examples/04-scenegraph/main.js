/**
 * 04-scenegraph — Solar system with Transform parent-child hierarchy.
 *
 * Sun (center, self-rotate) → Earth (orbit sun) → Moon (orbit earth)
 * Mars & Jupiter also orbit the sun. Click a body to select it;
 * overlay shows name and world position. Drag to orbit the camera.
 *
 * Transform hierarchy: child.worldMatrix = parent.worldMatrix × localMatrix.
 */
import { createGameLoop, Transform } from "@uploop/scene";
import { vec3, quat, mat4 } from "@uploop/math";
import { createSphere } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── GPU ──────────────────────────────────────────────────────
  const shader = createProgram(
    gl,
    builtinShaders.phong.vertex,
    builtinShaders.phong.fragment,
  );
  const sphere = createSphere(0.5, 32, 16);

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
  let camAngle = 0.3,
    lastMouseX = 0,
    dragging = false;
  const orbitDist = 14;

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 200);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.02, 0.02, 0.08, 1);
  resize();

  // ── Scene Graph ──────────────────────────────────────────────
  const sun = Transform(
    vec3.create(),
    quat.create(),
    vec3.set(vec3.create(), 1.5, 1.5, 1.5),
  );

  function createPlanet(parent, orbitRadius, scale, orbitSpeed, selfSpeed) {
    const orbit = Transform(
      vec3.create(),
      quat.create(),
      vec3.set(vec3.create(), scale, scale, scale),
      parent,
    );
    const body = Transform(
      vec3.create(orbitRadius, 0, 0),
      quat.create(),
      vec3.set(vec3.create(), 1, 1, 1),
      orbit,
    );
    return { orbit, body, orbitSpeed, selfSpeed };
  }

  const earth = createPlanet(sun, 3.5, 0.55, 1.2, 2.5);
  const moon = createPlanet(earth.body, 0.9, 0.27, 4.0, 0);
  const mars = createPlanet(sun, 5.5, 0.4, 0.7, 1.8);
  const jupiter = createPlanet(sun, 8.0, 1.1, 0.4, 1.2);

  const celestial = [
    { name: "Sun", t: sun, color: [1.0, 0.85, 0.1] },
    { name: "Earth", t: earth.body, color: [0.2, 0.5, 1.0] },
    { name: "Moon", t: moon.body, color: [0.75, 0.75, 0.8] },
    { name: "Mars", t: mars.body, color: [0.9, 0.3, 0.1] },
    { name: "Jupiter", t: jupiter.body, color: [0.85, 0.6, 0.35] },
  ];

  let selected = celestial[0];

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: {},
    update: {
      tick(s, dt) {
        sun.rotate(quat.fromEuler(quat.create(), 0, dt * 0.4, 0));
        for (const p of [earth, moon, mars, jupiter]) {
          p.orbit.rotate(
            quat.fromEuler(quat.create(), 0, dt * p.orbitSpeed, 0),
          );
          if (p.selfSpeed)
            p.body.rotate(
              quat.fromEuler(quat.create(), 0, dt * p.selfSpeed, 0),
            );
        }
        return s;
      },
    },
    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      const eye = vec3.create(
        Math.cos(camAngle) * orbitDist,
        5,
        Math.sin(camAngle) * orbitDist,
      );
      mat4.lookAt(view, eye, [0, 0, 0], [0, 1, 0]);

      for (const body of celestial) {
        const t = body.t;
        const bright = selected && selected.name === body.name ? 1.4 : 1.0;
        const [r, g, b] = body.color.map((c) => Math.min(c * bright, 1));

        gl.uniform4f(shader.uniforms.uColor.location, r, g, b, 1);
        gl.uniformMatrix4fv(
          shader.uniforms.uModel.location,
          false,
          t.worldMatrix,
        );
        gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
        gl.uniformMatrix4fv(
          shader.uniforms.uProjection.location,
          false,
          projection,
        );
        gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
        gl.uniform3fv(
          shader.uniforms.uLightDirection.location,
          vec3.normalize(vec3.create(), [1, 2, 1]),
        );
        gl.uniform3fv(shader.uniforms.uLightColor.location, [1, 1, 1]);
        gl.uniform3fv(shader.uniforms.uAmbientColor.location, [0.1, 0.1, 0.15]);
        gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);
        gl.uniform1f(shader.uniforms.uSpecularStrength.location, 0.4);
        gl.uniform1f(shader.uniforms.uShininess.location, 32);
        gl.uniform1i(shader.uniforms.uHasTexture.location, 0);
        gl.uniformMatrix3fv(
          shader.uniforms.uNormalMatrix.location,
          false,
          normalMatrix(t.worldMatrix),
        );
        gl.drawElements(gl.TRIANGLES, sphere.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      updateOverlay();
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── Input ────────────────────────────────────────────────────
  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    lastMouseX = e.clientX;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (dragging) camAngle += (e.clientX - lastMouseX) * 0.005;
    lastMouseX = e.clientX;
  });

  canvas.addEventListener("click", (e) => {
    if (Math.abs(e.clientX - lastMouseX) > 3) return; // was a drag
    const eye = vec3.create(
      Math.cos(camAngle) * orbitDist,
      5,
      Math.sin(camAngle) * orbitDist,
    );
    let best = celestial[0],
      bestDist = Infinity;
    for (const body of celestial) {
      const d = vec3.distance(body.t.worldPosition, eye);
      if (d < bestDist) {
        bestDist = d;
        best = body;
      }
    }
    selected = best;
  });

  // ── UI Overlay ───────────────────────────────────────────────
  const overlay = createOverlay(canvas);

  function updateOverlay() {
    if (!selected) return;
    const wp = selected.t.worldPosition;
    overlay.nameEl.textContent = `Selected: ${selected.name}`;
    overlay.posEl.textContent = `World: (${wp[0].toFixed(1)}, ${wp[1].toFixed(1)}, ${wp[2].toFixed(1)})`;
  }
  updateOverlay();

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (overlay) overlay.div.remove();
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

function createOverlay(canvas) {
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    fontFamily: "monospace",
    zIndex: "10",
    userSelect: "none",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  });
  function s(text) {
    const el = document.createElement("span");
    el.style.cssText =
      "color:#fff;background:#0008;padding:2px 8px;border-radius:3px;font-size:12px";
    el.textContent = text;
    return el;
  }
  const nameEl = s("Selected: —"),
    posEl = s("World: —");
  div.append(nameEl, posEl, s("🖱️ click body | drag to orbit"));
  canvas.parentElement.appendChild(div);
  return { nameEl, posEl, div };
}

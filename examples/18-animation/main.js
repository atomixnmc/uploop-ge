/**
 * 18-animation — Procedural character animation with sine waves.
 * Characters built from colored cubes (body, head, 2 arms, 2 legs).
 * Arms and legs swing via sin(time + phase), bodies bob up/down.
 */
import { createGameLoop } from "@uploop/scene";
import { mat4, vec3 } from "@uploop/math";
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
  const mesh = createCube(1);

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
  const projection = mat4.create(),
    view = mat4.create();
  let camAngle = -0.5,
    camPitch = 0.4,
    camDist = 6;
  let dragging = false,
    lastMX = 0,
    lastMY = 0;

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }

  function updateCamera() {
    const eye = vec3.create(
      Math.cos(camAngle) * Math.cos(camPitch) * camDist,
      Math.sin(camPitch) * camDist + 1.5,
      Math.sin(camAngle) * Math.cos(camPitch) * camDist,
    );
    mat4.lookAt(view, eye, [0, 1.5, 0], [0, 1, 0]);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.08, 0.1, 0.18, 1);
  resize();

  // ── Character builder ────────────────────────────────────────
  const NUM_CHARS = 3;
  const chars = [];
  for (let i = 0; i < NUM_CHARS; i++) {
    chars.push({
      pos: [(i - (NUM_CHARS - 1) / 2) * 2, 0, 0],
      armAngle: 0,
      legAngle: 0,
      bobPhase: i * Math.PI * 0.7,
      color: [
        0.4 + Math.random() * 0.5,
        0.3 + Math.random() * 0.4,
        0.5 + Math.random() * 0.4,
      ],
    });
  }

  // ── Limb helpers ─────────────────────────────────────────────
  const limbModel = mat4.create(),
    parentModel = mat4.create();

  function drawLimb(parentWorld, localPos, angleX, angleZ, sx, sy, sz, color) {
    // Place relative to parent
    mat4.copy(parentModel, parentWorld);
    parentModel[12] += localPos[0];
    parentModel[13] += localPos[1];
    parentModel[14] += localPos[2];

    // Rotation around pivot
    const rx = mat4.create();
    mat4.fromXRotation(rx, angleX);
    const rz = mat4.create();
    mat4.fromZRotation(rz, angleZ);
    mat4.multiply(limbModel, rz, rx);

    // Scale
    limbModel[0] *= sx;
    limbModel[1] *= sy;
    limbModel[2] *= sz;
    limbModel[4] *= sx;
    limbModel[5] *= sy;
    limbModel[6] *= sz;
    limbModel[8] *= sx;
    limbModel[9] *= sy;
    limbModel[10] *= sz;
    limbModel[12] = limbModel[13] = limbModel[14] = 0;

    mat4.multiply(limbModel, parentModel, limbModel);

    gl.uniform4f(shader.uniforms.uColor.location, ...color, 1);
    gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, limbModel);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  // ── Game Loop ────────────────────────────────────────────────
  const bodyModel = mat4.create();
  const loop = createGameLoop({
    state: { characters: chars, time: 0 },

    update: {
      tick(s, dt) {
        const t = s.time + dt;
        for (const ch of s.characters) {
          const phase = t * 3 + ch.bobPhase;
          ch.armAngle = Math.sin(phase) * 0.6;
          ch.legAngle = Math.sin(phase) * 0.5;
        }
        return { ...s, time: t };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      updateCamera();
      gl.useProgram(shader.program);
      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);

      const t = state.time + alpha * loop.fixedTimestep * 3;

      for (const ch of state.characters) {
        const phase = t * 3 + ch.bobPhase;
        const bob = Math.sin(phase * 1.2) * 0.15;

        // Body world matrix
        mat4.fromTranslation(
          bodyModel,
          vec3.create(ch.pos[0], ch.pos[1] + bob + 1.0, ch.pos[2]),
        );

        // Head
        drawLimb(
          bodyModel,
          [0, 0.45, 0],
          0,
          0,
          0.4,
          0.4,
          0.4,
          [0.95, 0.85, 0.7],
        );

        // Body (torso)
        drawLimb(bodyModel, [0, 0, 0], 0, 0, 0.5, 0.6, 0.3, ch.color);

        // Arms
        const armAngle = Math.sin(phase) * 0.6;
        drawLimb(
          bodyModel,
          [0.35, 0.1, 0],
          armAngle,
          0,
          0.15,
          0.4,
          0.15,
          ch.color.map((c) => c * 0.9),
        );
        drawLimb(
          bodyModel,
          [-0.35, 0.1, 0],
          -armAngle,
          0,
          0.15,
          0.4,
          0.15,
          ch.color.map((c) => c * 0.9),
        );

        // Legs
        const legAngle = Math.sin(phase) * 0.5;
        drawLimb(
          bodyModel,
          [0.12, -0.35, 0],
          legAngle,
          0,
          0.15,
          0.35,
          0.15,
          [0.2, 0.25, 0.45],
        );
        drawLimb(
          bodyModel,
          [-0.12, -0.35, 0],
          -legAngle,
          0,
          0.15,
          0.35,
          0.15,
          [0.2, 0.25, 0.45],
        );
      }
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── Camera Input ─────────────────────────────────────────────
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
      -1.2,
      Math.min(1.2, camPitch + (e.clientY - lastMY) * 0.005),
    );
    lastMX = e.clientX;
    lastMY = e.clientY;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    camDist = Math.max(2, Math.min(15, camDist + e.deltaY * 0.01));
  });

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
  };
}

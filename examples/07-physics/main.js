/**
 * 07-physics — Physics loop with fixed timestep Euler integration.
 *
 * Balls fall under gravity, bounce off ground at y=-2 with restitution.
 * Fixed timestep (1/120) decoupled from render rate.
 * Click to spawn new balls. Overlay shows ball count.
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
    builtinShaders.phong.vertex,
    builtinShaders.phong.fragment,
  );
  const sphere = createSphere(0.5, 24, 12);

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
  mat4.lookAt(view, [0, 0, 8], [0, -1, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.05, 0.05, 0.1, 1);

  // ── Helpers ──────────────────────────────────────────────────
  const rand = (a, b) => a + Math.random() * (b - a);
  const groundY = -2;
  const restitution = 0.6;

  function randomBall() {
    return {
      pos: [rand(-2.5, 2.5), rand(1, 4), rand(-2, 2)],
      vel: [rand(-1, 1), rand(-2, 0), rand(-1, 1)],
      radius: rand(0.25, 0.6),
      color: [rand(0.3, 1), rand(0.3, 1), rand(0.3, 1)],
    };
  }

  // ── Game Loop ────────────────────────────────────────────────
  const model = mat4.create();

  const loop = createGameLoop({
    fixedTimestep: 1 / 120, // physics at 120 Hz

    state: {
      balls: [randomBall(), randomBall(), randomBall(), randomBall()],
    },

    update: {
      /** Fixed-timestep Euler integration */
      tick(s, dt) {
        const gravity = -9.8;

        for (const b of s.balls) {
          // Apply gravity
          b.vel[1] += gravity * dt;

          // Euler integrate
          b.pos[0] += b.vel[0] * dt;
          b.pos[1] += b.vel[1] * dt;
          b.pos[2] += b.vel[2] * dt;

          // Ground collision
          const floor = groundY + b.radius;
          if (b.pos[1] < floor) {
            b.pos[1] = floor;
            b.vel[1] = Math.abs(b.vel[1]) * restitution;

            // Stop tiny bounces
            if (Math.abs(b.vel[1]) < 0.1) b.vel[1] = 0;

            // Friction on ground
            b.vel[0] *= 0.98;
            b.vel[2] *= 0.98;
          }

          // Side walls
          for (const axis of [0, 2]) {
            if (Math.abs(b.pos[axis]) > 3.5 - b.radius) {
              b.pos[axis] = Math.sign(b.pos[axis]) * (3.5 - b.radius);
              b.vel[axis] *= -restitution;
            }
          }
        }
        return s;
      },

      /** Spawn a new ball */
      spawn(s) {
        return { balls: [...s.balls, randomBall()] };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform3fv(shader.uniforms.uCameraPosition.location, [0, 0, 8]);
      gl.uniform3fv(
        shader.uniforms.uLightDirection.location,
        vec3.normalize(vec3.create(), [0.5, 1, 0.3]),
      );
      gl.uniform3fv(shader.uniforms.uLightColor.location, [1, 1, 1]);
      gl.uniform3fv(shader.uniforms.uAmbientColor.location, [0.08, 0.08, 0.12]);
      gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);
      gl.uniform1f(shader.uniforms.uSpecularStrength.location, 0.3);
      gl.uniform1f(shader.uniforms.uShininess.location, 16);
      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);

      // Draw ground plane
      const groundModel = mat4.create();
      mat4.fromTranslation(groundModel, [0, groundY, 0]);
      mat4.scale(groundModel, groundModel, [8, 0.1, 8]);
      gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, groundModel);
      gl.uniform4f(shader.uniforms.uColor.location, 0.2, 0.25, 0.35, 1);
      gl.uniformMatrix3fv(
        shader.uniforms.uNormalMatrix.location,
        false,
        Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]),
      );
      gl.drawElements(gl.TRIANGLES, sphere.indexCount, gl.UNSIGNED_SHORT, 0);

      // Draw each ball
      for (const b of state.balls) {
        mat4.fromTranslation(model, b.pos);
        mat4.scale(model, model, [b.radius, b.radius, b.radius]);
        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
        gl.uniform4f(shader.uniforms.uColor.location, ...b.color, 1);
        gl.uniformMatrix3fv(
          shader.uniforms.uNormalMatrix.location,
          false,
          Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]),
        );
        gl.drawElements(gl.TRIANGLES, sphere.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      updateOverlay();
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── Click to spawn ───────────────────────────────────────────
  canvas.addEventListener("click", () => loop.send("spawn"));

  // ── Overlay ──────────────────────────────────────────────────
  const overlay = createOverlay(canvas, loop);
  function updateOverlay() {
    const s = loop.getState();
    overlay.textContent = `Balls: ${s.balls.length} | 🖱️ click to spawn`;
  }
  updateOverlay();

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
  loop.subscribe(() => {
    const s = loop.getState();
    div.textContent = `Balls: ${s.balls.length} | 🖱️ click to spawn`;
  });
  return div;
}

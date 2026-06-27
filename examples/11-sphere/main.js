/**
 * 11-sphere — Lit sphere with orbiting light.
 *
 * State: { rotation, lightAngle }. The sphere rotates while a
 * directional light orbits around it. Normals are recomputed
 * each frame via the normal matrix. Shows how light interaction
 * with normals creates a 3D appearance.
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
  mat4.lookAt(view, [0, 0.8, 3.5], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  resize();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.08, 0.08, 0.15, 1);

  // ── Game Loop ────────────────────────────────────────────────
  const model = mat4.create();

  const loop = createGameLoop({
    state: { rotation: 0, lightAngle: 0 },

    update: {
      /** Advance sphere rotation and light orbit */
      tick(s, dt) {
        return {
          rotation: s.rotation + dt * 0.5,
          lightAngle: s.lightAngle + dt * 0.8,
        };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      // Smooth interpolation
      const rot = state.rotation + alpha * loop.fixedTimestep * 0.5;
      const lightRot = state.lightAngle + alpha * loop.fixedTimestep * 0.8;

      // Model matrix: rotate sphere around Y
      mat4.fromYRotation(model, rot);

      // Orbiting light direction (circles in XZ plane with slight Y tilt)
      const lightDir = vec3.normalize(vec3.create(), [
        Math.cos(lightRot) * 0.8,
        1.0,
        Math.sin(lightRot) * 0.8,
      ]);

      // Camera
      const eye = [0, 0.8, 3.5];

      gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );

      // Phong lighting — light position drives specular highlights
      gl.uniform3fv(shader.uniforms.uCameraPosition.location, eye);
      gl.uniform3fv(shader.uniforms.uLightDirection.location, lightDir);
      gl.uniform3fv(shader.uniforms.uLightColor.location, [1, 1, 0.95]);
      gl.uniform3fv(shader.uniforms.uAmbientColor.location, [0.08, 0.08, 0.15]);
      gl.uniform1f(shader.uniforms.uAmbientStrength.location, 1);
      gl.uniform1f(shader.uniforms.uSpecularStrength.location, 0.6);
      gl.uniform1f(shader.uniforms.uShininess.location, 64);
      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);
      gl.uniform4f(shader.uniforms.uColor.location, 0.8, 0.45, 0.3, 1); // warm orange
      gl.uniformMatrix3fv(
        shader.uniforms.uNormalMatrix.location,
        false,
        normalMatrix(model),
      );

      gl.drawElements(gl.TRIANGLES, sphere.indexCount, gl.UNSIGNED_SHORT, 0);
    },
  });

  loop.start();
  canvas._loop = loop;

  console.log(
    "%c💡 Sphere example%c | light orbits · normals drive shading · canvas._loop.describe()",
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

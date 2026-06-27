/**
 * 30-custom-pipeline — Deferred rendering + post-processing pipeline demo.
 *
 * Uses @uploop/custom-pipeline to set up a G-buffer, deferred lighting pass,
 * and post-effects (bloom + tonemap). Renders a lit scene with cubes.
 *
 * State: { rotation, pipeline }
 * Update: tick rotates scene
 * Render: pipeline.render() each frame
 */
import { createGameLoop } from "@uploop/scene";
import { vec3, mat4 } from "@uploop/math";
import { createCube, createSphere } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";
import {
  createPipeline,
  createStage,
  createAttachment,
  createScreenQuad,
  postProcessPreset,
} from "@uploop/custom-pipeline";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Meshes ────────────────────────────────────────────────────
  const cubeMesh = createCube(1);
  const sphereMesh = createSphere(0.6, 16, 8);

  const meshes = [cubeMesh, sphereMesh];
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  let curMesh = null;

  function useMesh(mesh) {
    if (curMesh === mesh) return;
    curMesh = mesh;
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
  }

  // ── Pipeline: Post-Processing ─────────────────────────────────
  const { stages, attachments } = postProcessPreset();
  const sceneColor = attachments[0];

  // Insert a geometry stage at the front
  const GEO_VS = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
out vec3 vNormal;
out vec3 vWorldPos;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uProjection * uView * worldPos;
}`;

  const GEO_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorldPos;
uniform vec3 uCameraPos;
uniform vec3 uColor;
out vec4 fragColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.3, 0.7, 0.5));
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 H = normalize(L + V);

  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 32.0);

  vec3 ambient = vec3(0.15);
  vec3 color = uColor * (ambient + diff * 0.8) + vec3(0.5) * spec * 0.3;
  fragColor = vec4(color, 1.0);
}`;

  const geometryStage = createStage({
    name: "geometry",
    vertexShader: GEO_VS,
    fragmentShader: GEO_FS,
    inputs: [],
    outputs: [sceneColor],
    clearColor: true,
    clearDepth: true,
  });

  const pipeline = createPipeline({ gl, stages: [geometryStage, ...stages], width: 0, height: 0 });
  const screenQuad = createScreenQuad(gl);

  // ── Scene objects ─────────────────────────────────────────────
  const objects = [
    { pos: [0, 0, 0], color: [0.9, 0.3, 0.3], mesh: cubeMesh, type: "cube" },
    { pos: [2, 0.5, 0], color: [0.3, 0.8, 0.3], mesh: sphereMesh, type: "sphere" },
    { pos: [-2, -0.3, 0], color: [0.3, 0.4, 0.9], mesh: cubeMesh, type: "cube" },
    { pos: [0, 0, 2.5], color: [0.9, 0.7, 0.2], mesh: sphereMesh, type: "sphere" },
    { pos: [1, -0.5, -2], color: [0.7, 0.2, 0.7], mesh: cubeMesh, type: "cube" },
  ];

  // ── Responsive canvas ─────────────────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1280, window.innerWidth * 0.9);
    const h = Math.max(720, window.innerHeight * 0.85);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (pipeline.width > 0) pipeline.resize(canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);

  gl.enable(gl.DEPTH_TEST);
  resize();

  // Initialize pipeline after resize
  pipeline.width = canvas.width;
  pipeline.height = canvas.height;
  pipeline.init();
  pipeline.resize(canvas.width, canvas.height);

  // ── Game Loop ─────────────────────────────────────────────────
  const projection = mat4.create();
  const view = mat4.create();
  const model = mat4.create();
  const cameraPos = vec3.set(vec3.create(), 0, 2, 6);

  function updateCamera() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
    mat4.lookAt(view, cameraPos, [0, 0, 0], [0, 1, 0]);
  }
  updateCamera();

  const loop = createGameLoop({
    state: { rotation: 0, objects },

    update: {
      tick(s, dt) {
        return { ...s, rotation: s.rotation + dt * 0.5 };
      },
    },

    render(state, alpha) {
      // ── Execute pipeline ──────────────────────────────────────
      updateCamera();

      // Bind geometry pass manually
      const geo = pipeline.stages[0];
      if (geo.enabled && geo.program) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, sceneColor.framebuffer);
        gl.viewport(0, 0, pipeline.width, pipeline.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(geo.program);

        gl.uniformMatrix4fv(gl.getUniformLocation(geo.program, "uView"), false, view);
        gl.uniformMatrix4fv(gl.getUniformLocation(geo.program, "uProjection"), false, projection);
        gl.uniform3fv(gl.getUniformLocation(geo.program, "uCameraPos"), cameraPos);

        const rot = state.rotation;
        for (const obj of state.objects) {
          useMesh(obj.mesh);
          mat4.fromYRotation(model, rot + objects.indexOf(obj) * 0.7);
          model[12] = obj.pos[0];
          model[13] = obj.pos[1];
          model[14] = obj.pos[2];
          gl.uniformMatrix4fv(gl.getUniformLocation(geo.program, "uModel"), false, model);
          gl.uniform3fv(gl.getUniformLocation(geo.program, "uColor"), obj.color);
          gl.drawElements(gl.TRIANGLES, obj.mesh.indexCount, gl.UNSIGNED_SHORT, 0);
        }
      }

      // Run remaining post-processing stages
      for (let i = 1; i < pipeline.stages.length; i++) {
        const stage = pipeline.stages[i];
        if (!stage.enabled || !stage.program) continue;

        if (stage.outputs.length > 0) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, stage.outputs[0].framebuffer);
        } else {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        gl.viewport(0, 0, pipeline.width, pipeline.height);
        gl.useProgram(stage.program);

        // Bind input textures
        let texUnit = 0;
        for (const input of stage.inputs) {
          if (input.texture) {
            gl.activeTexture(gl.TEXTURE0 + texUnit);
            gl.bindTexture(gl.TEXTURE_2D, input.texture);
            const loc = gl.getUniformLocation(stage.program, `u_${input.name}`);
            if (loc) gl.uniform1i(loc, texUnit);
            texUnit++;
          }
        }

        // Set texel size for blur passes
        const texelLoc = gl.getUniformLocation(stage.program, "u_texelSize");
        if (texelLoc) gl.uniform2f(texelLoc, 1 / pipeline.width, 1 / pipeline.height);

        screenQuad.draw();
      }

      updateOverlay();
    },
  });

  loop.start();
  canvas._loop = loop;

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute", bottom: "8px", left: "8px",
    fontFamily: "monospace", fontSize: "12px", zIndex: "10",
    display: "flex", gap: "8px",
  });
  const fpsEl = document.createElement("span");
  const pipeEl = document.createElement("span");
  for (const el of [fpsEl, pipeEl]) {
    el.style.cssText = "color:#fff;background:#0008;padding:4px 10px;border-radius:4px";
  }
  overlay.append(fpsEl, pipeEl);
  canvas.parentElement.appendChild(overlay);

  function updateOverlay() {
    fpsEl.textContent = `FPS: ${loop.fps}`;
    pipeEl.textContent = `Pipeline: ${pipeline.stages.length} stages (geometry → bright → blur → composite → tonemap)`;
  }

  return () => {
    loop.stop();
    overlay.remove();
    pipeline.dispose();
  };
}

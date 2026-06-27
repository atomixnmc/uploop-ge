/**
 * 16-postfx — Framebuffer pipeline: render scene to FBO, bloom blur, tonemap.
 * Bloom + tonemap toggle buttons. Rotating cube + sphere scene.
 */
import { createGameLoop } from "@uploop/scene";
import { mat4, vec3 } from "@uploop/math";
import { createCube, createSphere } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";
import { createFramebuffer } from "@uploop/renderer";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  const W = () => canvas.width,
    H = () => canvas.height;

  // Shaders
  const sShader = createProgram(
    gl,
    builtinShaders.phong.vertex,
    builtinShaders.phong.fragment,
  );
  const cShader = createProgram(
    gl,
    builtinShaders.post.quadVertex,
    builtinShaders.post.copyFragment,
  );
  const bShader = createProgram(
    gl,
    builtinShaders.post.quadVertex,
    builtinShaders.post.blurFragment,
  );
  const blShader = createProgram(
    gl,
    builtinShaders.post.quadVertex,
    builtinShaders.post.bloomFragment,
  );
  const tShader = createProgram(
    gl,
    builtinShaders.post.quadVertex,
    builtinShaders.post.tonemapFragment,
  );
  const programs = [cShader, bShader, blShader, tShader];

  // Scene meshes
  const cube = createCube(0.6),
    sphere = createSphere(0.4, 32, 16);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  for (const [name, off] of [
    ["aPosition", 0],
    ["aNormal", 12],
    ["aUV", 24],
  ]) {
    gl.enableVertexAttribArray(sShader.attributes[name].location);
    gl.vertexAttribPointer(
      sShader.attributes[name].location,
      name === "aUV" ? 2 : 3,
      gl.FLOAT,
      false,
      32,
      off,
    );
  }

  // Fullscreen quad
  const fsQuad = new Float32Array([
    -1, -1, 0, 0, 1, -1, 1, 0, 1, 1, 1, 1, -1, -1, 0, 0, 1, 1, 1, 1, -1, 1, 0,
    1,
  ]);
  const fsVao = gl.createVertexArray();
  gl.bindVertexArray(fsVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, fsQuad, gl.STATIC_DRAW);

  function drawQuad(shader) {
    gl.useProgram(shader.program);
    gl.bindVertexArray(fsVao);
    gl.enableVertexAttribArray(shader.attributes.aPosition.location);
    gl.vertexAttribPointer(
      shader.attributes.aPosition.location,
      2,
      gl.FLOAT,
      false,
      16,
      0,
    );
    gl.enableVertexAttribArray(shader.attributes.aUV.location);
    gl.vertexAttribPointer(
      shader.attributes.aUV.location,
      2,
      gl.FLOAT,
      false,
      16,
      8,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // Framebuffers
  let sceneFB, blurFB1, blurFB2;
  function createFBs() {
    const w = W(),
      h = H();
    for (const fb of [sceneFB, blurFB1, blurFB2])
      if (fb) {
        gl.deleteFramebuffer(fb.framebuffer);
        for (const t of fb.colorTextures) gl.deleteTexture(t);
        if (fb.depthTexture) gl.deleteTexture(fb.depthTexture);
      }
    sceneFB = createFramebuffer(gl, {
      width: w,
      height: h,
      depthAttachment: true,
    });
    blurFB1 = createFramebuffer(gl, {
      width: w,
      height: h,
      depthAttachment: false,
    });
    blurFB2 = createFramebuffer(gl, {
      width: w,
      height: h,
      depthAttachment: false,
    });
  }

  // Camera
  const projection = mat4.create(),
    view = mat4.create();
  mat4.lookAt(view, [0, 1.8, 4], [0, 0, 0], [0, 1, 0]);
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1280, window.innerWidth * 0.9);
    const h = Math.max(720, window.innerHeight * 0.85);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    updateProjection();
    createFBs();
  };
  window.addEventListener("resize", resize);
  function updateProjection() {
    mat4.perspective(
      projection,
      Math.PI / 4,
      canvas.width / Math.max(canvas.height, 1),
      0.1,
      100,
    );
  }
  gl.enable(gl.DEPTH_TEST);
  resize();

  // Normal matrix
  function nm(m) {
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

  const model = mat4.create();
  const loop = createGameLoop({
    state: { effects: { bloom: true, tonemap: true }, sceneRotation: 0 },
    update: {
      tick(s, dt) {
        return { ...s, sceneRotation: s.sceneRotation + dt * 0.6 };
      },
      toggleEffect(s, fx) {
        return { ...s, effects: fx };
      },
    },
    render(state, alpha) {
      const rot = state.sceneRotation + alpha * loop.fixedTimestep * 0.6;
      const w = sceneFB.width,
        h = sceneFB.height;

      // Pass 1: Scene → FBO
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFB.framebuffer);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0.05, 0.05, 0.1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(sShader.program);
      gl.uniformMatrix4fv(sShader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        sShader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform3fv(sShader.uniforms.uCameraPosition.location, [0, 1.8, 4]);
      gl.uniform3fv(
        sShader.uniforms.uLightDirection.location,
        vec3.normalize(vec3.create(), [1, 2, 1]),
      );
      gl.uniform3fv(sShader.uniforms.uLightColor.location, [1.2, 1.2, 1.2]);
      gl.uniform3fv(sShader.uniforms.uAmbientColor.location, [0.1, 0.1, 0.15]);
      gl.uniform1f(sShader.uniforms.uAmbientStrength.location, 1);
      gl.uniform1f(sShader.uniforms.uSpecularStrength.location, 0.5);
      gl.uniform1f(sShader.uniforms.uShininess.location, 64);
      gl.uniform1i(sShader.uniforms.uHasTexture.location, 0);

      for (const [mesh, tx, ty, tz, ry, color] of [
        [cube, -0.7, 0, 0, rot, [0.9, 0.35, 0.3, 1]],
        [sphere, 0.7, 0, 0, rot * 1.3, [0.2, 0.6, 1.0, 1]],
      ]) {
        mat4.fromYRotation(model, ry);
        model[12] = tx;
        model[13] = ty;
        model[14] = tz;
        gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        gl.uniform4fv(sShader.uniforms.uColor.location, color);
        gl.uniformMatrix4fv(sShader.uniforms.uModel.location, false, model);
        gl.uniformMatrix3fv(
          sShader.uniforms.uNormalMatrix.location,
          false,
          nm(model),
        );
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      // Post-processing
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W(), H());
      gl.disable(gl.DEPTH_TEST);
      const texel = [1 / w, 1 / h];

      let src = sceneFB.colorTextures[0];
      if (state.effects.bloom) {
        // Blur horizontal
        gl.bindFramebuffer(gl.FRAMEBUFFER, blurFB1.framebuffer);
        gl.viewport(0, 0, w, h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, src);
        gl.uniform1i(bShader.uniforms.uSource.location, 0);
        gl.uniform2fv(bShader.uniforms.uTexelSize.location, texel);
        gl.uniform1i(bShader.uniforms.uDirection.location, 0);
        drawQuad(bShader);

        // Blur vertical
        gl.bindFramebuffer(gl.FRAMEBUFFER, blurFB2.framebuffer);
        gl.viewport(0, 0, w, h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, blurFB1.colorTextures[0]);
        gl.uniform1i(bShader.uniforms.uSource.location, 0);
        gl.uniform1i(bShader.uniforms.uDirection.location, 1);
        drawQuad(bShader);

        // Composite scene + bloom
        gl.bindFramebuffer(gl.FRAMEBUFFER, blurFB1.framebuffer);
        gl.viewport(0, 0, w, h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, src);
        gl.uniform1i(blShader.uniforms.uSource.location, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, blurFB2.colorTextures[0]);
        gl.uniform1i(blShader.uniforms.uBloom.location, 1);
        gl.uniform1f(blShader.uniforms.uBloomStrength.location, 0.4);
        drawQuad(blShader);
        src = blurFB1.colorTextures[0];
      }

      // Final to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W(), H());
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src);
      if (state.effects.tonemap) {
        gl.uniform1i(tShader.uniforms.uSource.location, 0);
        gl.uniform1f(tShader.uniforms.uExposure.location, 1.0);
        drawQuad(tShader);
      } else {
        gl.uniform1i(cShader.uniforms.uSource.location, 0);
        drawQuad(cShader);
      }
    },
  });

  loop.start();
  canvas._loop = loop;

  // Overlay: bloom + tonemap toggle buttons
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    fontFamily: "monospace",
    zIndex: "10",
    userSelect: "none",
    display: "flex",
    gap: "8px",
  });
  let bloom = true,
    tonemap = true;
  for (const [label, key] of [
    ["Bloom", "bloom"],
    ["Tonemap", "tonemap"],
  ]) {
    const btn = document.createElement("button");
    btn.textContent = `${label}: ON`;
    Object.assign(btn.style, {
      background: "#4a4",
      color: "#fff",
      border: "1px solid #555",
      padding: "4px 10px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "11px",
    });
    btn.addEventListener("click", () => {
      if (key === "bloom") bloom = !bloom;
      else tonemap = !tonemap;
      btn.textContent = `${label}: ${(key === "bloom" ? bloom : tonemap) ? "ON" : "OFF"}`;
      btn.style.background = (key === "bloom" ? bloom : tonemap)
        ? "#4a4"
        : "#444";
      loop.send("toggleEffect", { bloom, tonemap });
    });
    div.append(btn);
  }
  canvas.parentElement.appendChild(div);

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (div) div.remove();
  };
}

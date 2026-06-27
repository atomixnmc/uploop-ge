/**
 * 17-skybox — Procedural cubemap sky + reflective sphere.
 * Gradient sky: light blue top, white horizon, dark blue bottom. Orbit camera.
 */
import { createGameLoop } from "@uploop/scene";
import { mat4, vec3 } from "@uploop/math";
import { createSphere, createCube } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";
import { createCubemap, bindTexture } from "@uploop/renderer";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // Procedural cubemap faces
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = faceCanvas.height = 128;
  const fctx = faceCanvas.getContext("2d");
  const grad = fctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#4a8fcf");
  grad.addColorStop(0.5, "#c8dcf0");
  grad.addColorStop(1, "#1a3050");
  fctx.fillStyle = grad;
  fctx.fillRect(0, 0, 128, 128);
  const cubemap = createCubemap(gl, Array(6).fill(faceCanvas), {
    generateMipmaps: true,
  });

  // Skybox shader
  const skyShader = createProgram(
    gl,
    `#version 300 es
in vec3 aPosition; uniform mat4 uView; uniform mat4 uProjection; out vec3 vWP;
void main(){vWP=aPosition;gl_Position=uProjection*mat4(mat3(uView))*vec4(aPosition,1.0);gl_Position=gl_Position.xyww;}`,
    `#version 300 es
precision highp float; in vec3 vWP; uniform samplerCube uSky; out vec4 fc;
void main(){fc=texture(uSky,normalize(vWP));}`,
  );

  // Reflection shader
  const reflShader = createProgram(
    gl,
    `#version 300 es
in vec3 aPosition; in vec3 aNormal; in vec2 aUV;
uniform mat4 uModel,uView,uProjection; uniform mat3 uNM;
out vec3 vWP,vN; out vec2 vUV;
void main(){vec4 wp=uModel*vec4(aPosition,1.0);gl_Position=uProjection*uView*wp;vWP=wp.xyz;vN=normalize(uNM*aNormal);vUV=aUV;}`,
    `#version 300 es
precision highp float; in vec3 vWP,vN,vUV; uniform vec3 uCP; uniform samplerCube uEM;
uniform float uRS; uniform vec4 uColor; out vec4 fc;
void main(){vec3 I=normalize(vWP-uCP);vec3 R=reflect(I,normalize(vN));
fc=vec4(mix(uColor.rgb,texture(uEM,R).rgb,uRS),uColor.a);}`,
  );

  // Meshes
  const skyCube = createCube(20),
    sphere = createSphere(0.7, 48, 24);

  // Sky VAO (position only)
  const skyVao = gl.createVertexArray();
  gl.bindVertexArray(skyVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, skyCube.vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(skyShader.attributes.aPosition.location);
  gl.vertexAttribPointer(
    skyShader.attributes.aPosition.location,
    3,
    gl.FLOAT,
    false,
    32,
    0,
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skyCube.indices, gl.STATIC_DRAW);

  // Sphere VAO (PNU)
  const sphereVao = gl.createVertexArray();
  gl.bindVertexArray(sphereVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
  for (const [name, off] of [
    ["aPosition", 0],
    ["aNormal", 12],
    ["aUV", 24],
  ]) {
    gl.enableVertexAttribArray(reflShader.attributes[name].location);
    gl.vertexAttribPointer(
      reflShader.attributes[name].location,
      name === "aUV" ? 2 : 3,
      gl.FLOAT,
      false,
      32,
      off,
    );
  }

  // Camera
  const projection = mat4.create(),
    view = mat4.create();
  let camAngle = 0,
    camPitch = 0.3,
    camDist = 5,
    dragging = false,
    lx = 0,
    ly = 0;
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
  function updCam() {
    const e = vec3.create(
      Math.cos(camAngle) * Math.cos(camPitch) * camDist,
      Math.sin(camPitch) * camDist,
      Math.sin(camAngle) * Math.cos(camPitch) * camDist,
    );
    mat4.lookAt(view, e, [0, 0, 0], [0, 1, 0]);
    return e;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  resize();

  function skyView(v) {
    const m = mat4.clone(v);
    m[12] = m[13] = m[14] = 0;
    return m;
  }
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

  // Game Loop
  const model = mat4.create();
  const loop = createGameLoop({
    state: { rotation: 0, reflectionStrength: 0.5 },
    update: {
      tick(s, dt) {
        return { ...s, rotation: s.rotation + dt * 0.3 };
      },
      setReflection(s, v) {
        return { ...s, reflectionStrength: v };
      },
    },
    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const eye = updCam();

      // Skybox
      gl.depthMask(false);
      gl.useProgram(skyShader.program);
      gl.bindVertexArray(skyVao);
      gl.uniformMatrix4fv(
        skyShader.uniforms.uView.location,
        false,
        skyView(view),
      );
      gl.uniformMatrix4fv(
        skyShader.uniforms.uProjection.location,
        false,
        projection,
      );
      bindTexture(gl, cubemap, 0, "cube");
      gl.uniform1i(skyShader.uniforms.uSky.location, 0);
      gl.drawElements(gl.TRIANGLES, skyCube.indexCount, gl.UNSIGNED_SHORT, 0);
      gl.depthMask(true);

      // Reflective sphere
      gl.useProgram(reflShader.program);
      gl.bindVertexArray(sphereVao);
      mat4.fromYRotation(model, state.rotation);
      model[13] = Math.sin(state.rotation * 1.5) * 0.15;
      gl.uniformMatrix4fv(reflShader.uniforms.uModel.location, false, model);
      gl.uniformMatrix3fv(reflShader.uniforms.uNM.location, false, nm(model));
      gl.uniformMatrix4fv(reflShader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        reflShader.uniforms.uProjection.location,
        false,
        projection,
      );
      gl.uniform3fv(reflShader.uniforms.uCP.location, eye);
      gl.uniform4f(reflShader.uniforms.uColor.location, 0.7, 0.75, 0.8, 1);
      bindTexture(gl, cubemap, 0, "cube");
      gl.uniform1i(reflShader.uniforms.uEM.location, 0);
      gl.uniform1f(reflShader.uniforms.uRS.location, state.reflectionStrength);
      gl.drawElements(gl.TRIANGLES, sphere.indexCount, gl.UNSIGNED_SHORT, 0);
    },
  });

  loop.start();
  canvas._loop = loop;

  // Input
  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    camAngle += (e.clientX - lx) * 0.005;
    camPitch = Math.max(
      -1.4,
      Math.min(1.4, camPitch + (e.clientY - ly) * 0.005),
    );
    lx = e.clientX;
    ly = e.clientY;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    camDist = Math.max(1.5, Math.min(15, camDist + e.deltaY * 0.01));
  });

  // Overlay: reflection slider
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
    alignItems: "center",
  });
  const lbl = document.createElement("span");
  lbl.style.cssText =
    "color:#aaa;font-size:11px;padding:4px 8px;background:#0008;border-radius:4px";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.01";
  slider.value = "0.5";
  slider.style.width = "80px";
  slider.addEventListener("input", () => {
    loop.send("setReflection", parseFloat(slider.value));
    lbl.textContent = `Reflect: ${slider.value}`;
  });
  lbl.textContent = "Reflect: 0.5";
  div.append(lbl, slider);
  canvas.parentElement.appendChild(div);

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (div) div.remove();
  };
}

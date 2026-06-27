/**
 * 14-pbr — PBR material grid: 5×5 spheres, X=roughness, Y=metallic.
 * Orbit camera via mouse drag. Per-sphere uniforms in one draw loop.
 */
import { createGameLoop } from "@uploop/scene";
import { mat4, vec3 } from "@uploop/math";
import { createSphere } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  const shader = createProgram(
    gl,
    builtinShaders.pbr.vertex,
    builtinShaders.pbr.fragment,
  );
  const mesh = createSphere(0.35, 32, 16);

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

  // Camera
  const projection = mat4.create(),
    view = mat4.create();
  let ca = -0.4,
    cp = 0.5,
    cd = 10,
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
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }
  function updCam() {
    const e = vec3.create(
      Math.cos(ca) * Math.cos(cp) * cd,
      Math.sin(cp) * cd,
      Math.sin(ca) * Math.cos(cp) * cd,
    );
    mat4.lookAt(view, e, [0, 0, 0], [0, 1, 0]);
    return e;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.05, 0.05, 0.1, 1);
  resize();

  // Build roughness/metallic arrays (5×5 grid)
  const GRID = 5,
    roughness = [],
    metallic = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      roughness.push(x / (GRID - 1));
      metallic.push(y / (GRID - 1));
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

  const model = mat4.create();
  const loop = createGameLoop({
    state: { roughness, metallic },
    update: {
      tick(s, dt) {
        return s;
      },
    },
    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);
      const eye = updCam();

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
      gl.uniform3fv(shader.uniforms.uLightColor.location, [2, 2, 2]);
      gl.uniform3fv(shader.uniforms.uAmbientColor.location, [0.3, 0.3, 0.4]);
      gl.uniform4f(shader.uniforms.uColor.location, 1, 1, 1, 1);
      gl.uniform1i(shader.uniforms.uHasTexture.location, 0);
      gl.uniform1i(shader.uniforms.uHasMRMap.location, 0);

      const sp = 1.8,
        off = ((GRID - 1) * sp) / 2;
      for (let i = 0; i < GRID * GRID; i++) {
        const gx = i % GRID,
          gy = Math.floor(i / GRID);
        mat4.fromTranslation(
          model,
          vec3.create(gx * sp - off, gy * sp - off, 0),
        );
        gl.uniformMatrix4fv(shader.uniforms.uModel.location, false, model);
        gl.uniformMatrix3fv(
          shader.uniforms.uNormalMatrix.location,
          false,
          nm(model),
        );
        gl.uniform1f(shader.uniforms.uRoughness.location, state.roughness[i]);
        gl.uniform1f(shader.uniforms.uMetallic.location, state.metallic[i]);
        gl.uniform3f(shader.uniforms.uBaseColor.location, 0.8, 0.35, 0.3);
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
      }
    },
  });

  loop.start();
  canvas._loop = loop;

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
    ca += (e.clientX - lx) * 0.005;
    cp = Math.max(-1.4, Math.min(1.4, cp + (e.clientY - ly) * 0.005));
    lx = e.clientX;
    ly = e.clientY;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cd = Math.max(3, Math.min(20, cd + e.deltaY * 0.01));
  });

  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    fontFamily: "monospace",
    zIndex: "10",
    userSelect: "none",
  });
  const lbl = document.createElement("span");
  lbl.style.cssText =
    "color:#aaa;font-size:11px;padding:4px 8px;background:#0008;border-radius:4px";
  lbl.textContent =
    "\uD83D\uDDB1\uFE0F drag orbit \u00B7 scroll zoom  |  X=roughness  Y=metallic";
  div.append(lbl);
  canvas.parentElement.appendChild(div);

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (div) div.remove();
  };
}

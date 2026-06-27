/**
 * 15-particles — 500 GPU particles via instanced billboard quads.
 * Spawn from origin, move outward, fade/die, respawn. FPS + count overlay.
 */
import { createGameLoop } from "@uploop/scene";
import { mat4, vec3 } from "@uploop/math";
import { createProgram } from "@uploop/shader";

const MAX = 500;

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // Billboard instanced shader
  const vs = `#version 300 es
in vec3 aPosition; in vec2 aUV; in vec3 aIPos; in vec4 aIColor; in float aISize;
uniform mat4 uView, uProjection; out vec2 vUV; out vec4 vColor;
void main(){vec3 R=vec3(uView[0][0],uView[1][0],uView[2][0]),U=vec3(uView[0][1],uView[1][1],uView[2][1]);
vec3 wp=aIPos+(aPosition.x*R+aPosition.y*U)*aISize;gl_Position=uProjection*uView*vec4(wp,1.0);vUV=aUV;vColor=aIColor;}`;
  const fs = `#version 300 es
precision highp float; in vec2 vUV; in vec4 vColor; out vec4 fc;
void main(){float d=length(vUV-0.5)*2.0;fc=vec4(vColor.rgb,smoothstep(1.0,0.85,d)*vColor.a);}`;

  const shader = createProgram(gl, vs, fs);

  // Quad (2 triangles, [-0.5,0.5]²)
  const qv = new Float32Array([
    -0.5, -0.5, 0, 0, 0, 0.5, -0.5, 0, 1, 0, 0.5, 0.5, 0, 1, 1, -0.5, -0.5, 0,
    0, 0, 0.5, 0.5, 0, 1, 1, -0.5, 0.5, 0, 0, 1,
  ]);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, qv, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(shader.attributes.aPosition.location);
  gl.vertexAttribPointer(
    shader.attributes.aPosition.location,
    3,
    gl.FLOAT,
    false,
    20,
    0,
  );
  gl.enableVertexAttribArray(shader.attributes.aUV.location);
  gl.vertexAttribPointer(
    shader.attributes.aUV.location,
    2,
    gl.FLOAT,
    false,
    20,
    12,
  );

  // Instance buffer: pos(3)+pad(1)+color(4)+size(1)+pad(1)=10 floats=40 bytes
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ib);
  gl.bufferData(gl.ARRAY_BUFFER, MAX * 40, gl.DYNAMIC_DRAW);
  for (const [attr, off, size] of [
    ["aIPos", 0, 3],
    ["aIColor", 16, 4],
    ["aISize", 32, 1],
  ]) {
    gl.enableVertexAttribArray(shader.attributes[attr].location);
    gl.vertexAttribPointer(
      shader.attributes[attr].location,
      size,
      gl.FLOAT,
      false,
      40,
      off,
    );
    gl.vertexAttribDivisor(shader.attributes[attr].location, 1);
  }

  // Camera
  const projection = mat4.create(),
    view = mat4.create();
  let ca = 0,
    cp = 0.4,
    cd = 4,
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
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0.02, 0.02, 0.06, 1);
  resize();

  // Init particles
  function mkP() {
    const a = Math.random() * Math.PI * 2,
      phi = Math.acos(2 * Math.random() - 1),
      sp = 0.3 + Math.random() * 1.2;
    return {
      pos: [0, 0, 0],
      vel: [
        Math.cos(a) * Math.sin(phi) * sp,
        Math.cos(phi) * sp,
        Math.sin(a) * Math.sin(phi) * sp,
      ],
      life: 1 + Math.random() * 1.5,
      color: [
        Math.random() * 0.6 + 0.4,
        Math.random() * 0.4 + 0.2,
        Math.random() * 0.6 + 0.3,
        1,
      ],
      size: 0.02 + Math.random() * 0.04,
    };
  }
  const particles = Array.from({ length: MAX }, mkP);
  const instData = new Float32Array(MAX * 10);

  // Game Loop
  const loop = createGameLoop({
    state: { particles, count: MAX },
    update: {
      tick(s, dt) {
        for (let i = 0; i < s.count; i++) {
          const p = s.particles[i];
          p.pos[0] += p.vel[0] * dt;
          p.pos[1] += p.vel[1] * dt;
          p.pos[2] += p.vel[2] * dt;
          p.life -= dt;
          if (p.life <= 0) Object.assign(p, mkP());
        }
        return s;
      },
    },
    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      updCam();
      gl.useProgram(shader.program);
      gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
      gl.uniformMatrix4fv(
        shader.uniforms.uProjection.location,
        false,
        projection,
      );

      for (let i = 0; i < state.count; i++) {
        const p = state.particles[i],
          o = i * 10;
        instData[o] = p.pos[0];
        instData[o + 1] = p.pos[1];
        instData[o + 2] = p.pos[2];
        instData[o + 3] = 0;
        instData[o + 4] = p.color[0];
        instData[o + 5] = p.color[1];
        instData[o + 6] = p.color[2];
        instData[o + 7] = Math.max(0, p.life);
        instData[o + 8] = p.size;
        instData[o + 9] = 0;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, ib);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        instData.subarray(0, state.count * 10),
      );
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, state.count);
      updOv();
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
  const fe = document.createElement("span"),
    ce = document.createElement("span");
  for (const e of [fe, ce]) {
    e.style.cssText =
      "color:#fff;background:#0008;padding:4px 10px;border-radius:4px;font-size:12px";
  }
  div.append(fe, ce);
  canvas.parentElement.appendChild(div);
  function updOv() {
    fe.textContent = `FPS: ${loop.fps}`;
    ce.textContent = `Particles: ${MAX}`;
  }

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (div) div.remove();
  };
}

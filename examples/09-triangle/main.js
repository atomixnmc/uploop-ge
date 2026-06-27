/**
 * 09-triangle — Pure WebGL triangle with rainbow hue cycle.
 *
 * Simplest possible example showing the uploop pattern even for
 * raw WebGL. No geometry/shader packages — just plain WebGL.
 * State: { hue }. Update: tick advances hue. Render: draw triangle.
 */
import { createGameLoop } from "@uploop/scene";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── Vertex shader ────────────────────────────────────────────
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(
    vs,
    `#version 300 es
in vec2 aPosition;
out vec2 vPos;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vPos = aPosition;
}`,
  );
  gl.compileShader(vs);

  // ── Fragment shader — hue uniform drives color ───────────────
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(
    fs,
    `#version 300 es
precision highp float;
in vec2 vPos;
uniform float uHue;
out vec4 fragColor;

vec3 hsv2rgb(float h, float s, float v) {
  vec3 c = vec3(h * 6.0, s, v);
  vec3 rgb = clamp(abs(mod(c.r + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

void main() {
  // Radial gradient with hue-based color
  float dist = length(vPos);
  vec3 color = hsv2rgb(uHue + dist * 0.5, 0.8, 1.0 - dist * 0.3);
  fragColor = vec4(color, 1.0);
}`,
  );
  gl.compileShader(fs);

  // ── Program ──────────────────────────────────────────────────
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const aPosLoc = gl.getAttribLocation(program, "aPosition");
  const uHueLoc = gl.getUniformLocation(program, "uHue");

  // ── Triangle vertices ────────────────────────────────────────
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0.8, -0.8, -0.6, 0.8, -0.6]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(aPosLoc);
  gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

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
  }
  resize();
  window.addEventListener("resize", resize);

  // ── Setup ────────────────────────────────────────────────────
  gl.clearColor(0.05, 0.05, 0.1, 1);

  // ── Game Loop — state → update → render ──────────────────────
  const loop = createGameLoop({
    state: { hue: 0 },

    update: {
      /** Cycle hue each tick */
      tick(s, dt) {
        return { hue: (s.hue + dt * 0.3) % 1 };
      },
    },

    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      // Interpolate hue for smooth rainbow cycle
      const hue = (state.hue + alpha * loop.fixedTimestep * 0.3) % 1;
      gl.uniform1f(uHueLoc, hue);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  });

  loop.start();
  canvas._loop = loop;

  console.log(
    "%c🌈 Triangle example%c | canvas._loop.describe() → simplest uploop pattern",
    "color:#4f8",
    "",
  );

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
  };
}

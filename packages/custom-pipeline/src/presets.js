/**
 * Presets — Pre-built pipeline configurations for common rendering setups.
 *
 * Each preset returns a { stages, attachments } config ready for createPipeline.
 *
 * @depends types.js, stage.js, attachment.js
 */
import { createStage } from './stage.js'
import { createAttachment } from './attachment.js'

// ── Built-in GLSL snippets ────────────────────────────────────────

const FULLSCREEN_VS = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const POSTFX_TONEMAP_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D u_color;
out vec4 fragColor;

vec3 aces(vec3 x) {
  float a = 2.51; float b = 0.03; float c = 2.43; float d = 0.59; float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 color = texture(u_color, vUV).rgb;
  color = aces(color);
  color = pow(color, vec3(1.0 / 2.2)); // gamma
  fragColor = vec4(color, 1.0);
}`

const POSTFX_BLOOM_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D u_color;
uniform float u_threshold;
uniform float u_intensity;
out vec4 fragColor;

void main() {
  vec3 color = texture(u_color, vUV).rgb;
  float brightness = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 bright = color * smoothstep(u_threshold, u_threshold + 0.2, brightness);
  fragColor = vec4(bright * u_intensity, 1.0);
}`

const BLUR_H_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D u_input;
uniform vec2 u_texelSize;
out vec4 fragColor;

void main() {
  vec4 color = vec4(0.0);
  float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  for (int i = -4; i <= 4; i++) {
    float w = weights[abs(i)];
    color += texture(u_input, vUV + vec2(float(i) * u_texelSize.x, 0.0)) * w;
  }
  fragColor = color;
}`

const BLUR_V_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D u_input;
uniform vec2 u_texelSize;
out vec4 fragColor;

void main() {
  vec4 color = vec4(0.0);
  float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  for (int i = -4; i <= 4; i++) {
    float w = weights[abs(i)];
    color += texture(u_input, vUV + vec2(0.0, float(i) * u_texelSize.y)) * w;
  }
  fragColor = color;
}`

const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D u_color;
uniform sampler2D u_bloom;
uniform float u_bloomStrength;
out vec4 fragColor;

void main() {
  vec3 color = texture(u_color, vUV).rgb;
  vec3 bloom = texture(u_bloom, vUV).rgb;
  fragColor = vec4(color + bloom * u_bloomStrength, 1.0);
}`

// ── Presets ───────────────────────────────────────────────────────

/**
 * Standard post-processing pipeline: bloom + tonemap.
 * @returns {{ stages: Stage[], attachments: Attachment[] }}
 */
export function postProcessPreset() {
  const sceneColor = createAttachment({ name: 'sceneColor', type: 'color', format: 'rgba16f' })
  const brightTex = createAttachment({ name: 'bright', type: 'color', format: 'rgba16f' })
  const blurHTex = createAttachment({ name: 'blurH', type: 'color', format: 'rgba16f' })
  const blurVTex = createAttachment({ name: 'blurV', type: 'color', format: 'rgba16f' })

  const stages = [
    createStage({
      name: 'bright-pass',
      vertexShader: FULLSCREEN_VS,
      fragmentShader: POSTFX_BLOOM_FS,
      inputs: [sceneColor],
      outputs: [brightTex],
      uniforms: { u_threshold: 0.8, u_intensity: 1.0 },
    }),
    createStage({
      name: 'blur-h',
      vertexShader: FULLSCREEN_VS,
      fragmentShader: BLUR_H_FS,
      inputs: [brightTex],
      outputs: [blurHTex],
    }),
    createStage({
      name: 'blur-v',
      vertexShader: FULLSCREEN_VS,
      fragmentShader: BLUR_V_FS,
      inputs: [blurHTex],
      outputs: [blurVTex],
    }),
    createStage({
      name: 'composite',
      vertexShader: FULLSCREEN_VS,
      fragmentShader: COMPOSITE_FS,
      inputs: [sceneColor, blurVTex],
      outputs: [],
      uniforms: { u_bloomStrength: 0.6 },
    }),
    createStage({
      name: 'tonemap',
      vertexShader: FULLSCREEN_VS,
      fragmentShader: POSTFX_TONEMAP_FS,
      inputs: [],
      outputs: [],
      uniforms: {},
    }),
  ]

  return { stages, attachments: [sceneColor, brightTex, blurHTex, blurVTex] }
}

/**
 * Deferred rendering setup: G-buffer + lighting pass.
 * @returns {{ stages: Stage[], attachments: Attachment[] }}
 */
export function deferredPreset() {
  const gBufferColor = createAttachment({ name: 'gColor', type: 'color', format: 'rgba8' })
  const gBufferNormal = createAttachment({ name: 'gNormal', type: 'color', format: 'rgba16f' })
  const gBufferDepth = createAttachment({ name: 'gDepth', type: 'depth', format: 'depth24' })

  // Geometry pass writes to G-buffer (handled by user's scene render)
  const geometryStage = createStage({
    name: 'geometry',
    vertexShader: '', // user-provided
    fragmentShader: '', // user-provided
    inputs: [],
    outputs: [gBufferColor, gBufferNormal],
    clearColor: true,
    clearDepth: true,
  })

  const LIGHTING_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D u_gColor;
uniform sampler2D u_gNormal;
uniform vec3 u_cameraPos;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform vec3 u_ambient;
out vec4 fragColor;

void main() {
  vec4 albedo = texture(u_gColor, vUV);
  vec3 normal = texture(u_gNormal, vUV).rgb * 2.0 - 1.0;

  float NdotL = max(dot(normal, normalize(u_lightDir)), 0.0);
  vec3 diffuse = albedo.rgb * u_lightColor * NdotL;
  vec3 ambient = albedo.rgb * u_ambient;

  fragColor = vec4(diffuse + ambient, albedo.a);
}`

  const lightingStage = createStage({
    name: 'lighting',
    vertexShader: FULLSCREEN_VS,
    fragmentShader: LIGHTING_FS,
    inputs: [gBufferColor, gBufferNormal],
    outputs: [],
    clearColor: false,
    clearDepth: false,
    uniforms: {
      u_lightDir: [0.3, 0.7, 0.5],
      u_lightColor: [1.2, 1.1, 1.0],
      u_ambient: [0.15, 0.15, 0.2],
    },
  })

  return {
    stages: [geometryStage, lightingStage],
    attachments: [gBufferColor, gBufferNormal, gBufferDepth],
  }
}

/**
 * Shadow map pipeline: depth-only pass + scene with shadows.
 * @returns {{ stages: Stage[], attachments: Attachment[] }}
 */
export function shadowMapPreset() {
  const shadowMap = createAttachment({ name: 'shadowMap', type: 'depth', format: 'depth24' })

  const DEPTH_VS = `#version 300 es
in vec3 aPosition;
uniform mat4 uLightViewProj;
uniform mat4 uModel;

void main() {
  gl_Position = uLightViewProj * uModel * vec4(aPosition, 1.0);
}`

  const DEPTH_FS = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
  // Depth-only pass, no fragment output needed
  fragColor = vec4(1.0);
}`

  const shadowStage = createStage({
    name: 'shadow-map',
    vertexShader: DEPTH_VS,
    fragmentShader: DEPTH_FS,
    inputs: [],
    outputs: [shadowMap],
    clearColor: true,
    clearDepth: true,
  })

  return {
    stages: [shadowStage],
    attachments: [shadowMap],
  }
}

export default { postProcessPreset, deferredPreset, shadowMapPreset }

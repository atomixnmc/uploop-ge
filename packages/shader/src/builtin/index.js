/**
 * Built-in Shader Library
 *
 * Each shader exports { vertex, fragment } GLSL source strings.
 * All use standard naming conventions:
 *   - Attributes: aPosition, aNormal, aUV, aColor, aTangent
 *   - Uniforms:  uModel, uView, uProjection, uNormalMatrix, uCameraPosition
 *   - Material:   uColor, uTexture, uRoughness, uMetallic, etc.
 */

// Precision header for fragment shaders
const PRECISION = `precision highp float;\n`

// Common uniforms shared by most shaders
const COMMON_UNIFORMS = `
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;
`

// Vertex helper function to compute world pos, normal, etc.
const VERTEX_SETUP = `
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  gl_Position = uProjection * uView * worldPos;
`

// --- Unlit (flat color + optional texture) ---

export const unlit = {
  vertex: `#version 300 es
in vec3 aPosition;
in vec2 aUV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

out vec2 vUV;

void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  vUV = aUV;
}`,

  fragment: `#version 300 es
${PRECISION}
in vec2 vUV;

uniform vec4 uColor;
uniform sampler2D uTexture;
uniform bool uHasTexture;

out vec4 fragColor;

void main() {
  vec4 base = uHasTexture ? texture(uTexture, vUV) : uColor;
  fragColor = base;
}`,
}

// --- Blinn-Phong (ambient + diffuse + specular) ---

export const phong = {
  vertex: `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUV;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  gl_Position = uProjection * uView * worldPos;
  vWorldPos = worldPos.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  vUV = aUV;
}`,

  fragment: `#version 300 es
${PRECISION}
in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUV;

uniform vec3 uCameraPosition;
uniform vec4 uColor;
uniform sampler2D uTexture;
uniform bool uHasTexture;

// Light
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform float uAmbientStrength;

// Material
uniform float uSpecularStrength;
uniform float uShininess;

out vec4 fragColor;

void main() {
  vec3 base = uHasTexture ? texture(uTexture, vUV).rgb : uColor.rgb;
  vec3 N = normalize(vNormal);
  vec3 L = normalize(-uLightDirection);
  vec3 V = normalize(uCameraPosition - vWorldPos);
  vec3 H = normalize(L + V);

  // Ambient
  vec3 ambient = uAmbientColor * uAmbientStrength * base;

  // Diffuse
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = uLightColor * diff * base;

  // Specular (Blinn-Phong)
  float spec = pow(max(dot(N, H), 0.0), uShininess);
  vec3 specular = uLightColor * spec * uSpecularStrength;

  vec3 result = ambient + diffuse + specular;
  fragColor = vec4(result, uColor.a);
}`,
}

// --- PBR (metallic-roughness, simplified) ---

export const pbr = {
  vertex: `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUV;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  gl_Position = uProjection * uView * worldPos;
  vWorldPos = worldPos.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  vUV = aUV;
}`,

  fragment: `#version 300 es
${PRECISION}
in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUV;

uniform vec3 uCameraPosition;
uniform vec4 uColor;
uniform sampler2D uTexture;
uniform bool uHasTexture;
uniform sampler2D uMetallicRoughnessMap;
uniform bool uHasMRMap;

// Material
uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uBaseColor;
uniform float uAmbientStrength;

// Light
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;

out vec4 fragColor;

const float PI = 3.14159265359;

float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  float denom = NdotH2 * (a2 - 1.0) + 1.0;
  return a2 / (PI * denom * denom);
}

float geometrySchlickGGX(float NdotV, float roughness) {
  float r = roughness + 1.0;
  float k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  return geometrySchlickGGX(max(dot(N, V), 0.0), roughness)
       * geometrySchlickGGX(max(dot(N, L), 0.0), roughness);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  vec3 albedo = uHasTexture ? texture(uTexture, vUV).rgb : uBaseColor;
  float metallic = uHasMRMap ? texture(uMetallicRoughnessMap, vUV).b : uMetallic;
  float roughness = uHasMRMap ? texture(uMetallicRoughnessMap, vUV).g : uRoughness;

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPosition - vWorldPos);
  vec3 L = normalize(-uLightDirection);
  vec3 H = normalize(V + L);

  vec3 F0 = mix(vec3(0.04), albedo, metallic);

  // Cook-Torrance BRDF
  float NDF = distributionGGX(N, H, roughness);
  float G = geometrySmith(N, V, L, roughness);
  vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

  vec3 kS = F;
  vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

  float NdotL = max(dot(N, L), 0.0);
  vec3 numerator = NDF * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * NdotL + 0.0001;
  vec3 specular = numerator / denominator;

  vec3 Lo = (kD * albedo / PI + specular) * uLightColor * NdotL;
  vec3 ambient = uAmbientColor * albedo * uAmbientStrength;

  fragColor = vec4(ambient + Lo, uColor.a);
}`,
}

// --- Skinned Phong (for animated models with bone weights) ---

export const skinned = {
  vertex: `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUV;
in vec4 aJoints;
in vec4 aWeights;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;
uniform mat4 uJointMatrices[64];

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUV;

void main() {
  mat4 skinMat =
    aWeights.x * uJointMatrices[int(aJoints.x)] +
    aWeights.y * uJointMatrices[int(aJoints.y)] +
    aWeights.z * uJointMatrices[int(aJoints.z)] +
    aWeights.w * uJointMatrices[int(aJoints.w)];

  vec4 worldPos = uModel * skinMat * vec4(aPosition, 1.0);
  gl_Position = uProjection * uView * worldPos;
  vWorldPos = worldPos.xyz;
  vNormal = normalize(uNormalMatrix * mat3(skinMat) * aNormal);
  vUV = aUV;
}`,

  fragment: `#version 300 es
${PRECISION}
in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUV;

uniform vec3 uCameraPosition;
uniform vec4 uColor;
uniform sampler2D uTexture;
uniform bool uHasTexture;

// Light
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform float uAmbientStrength;

// Material
uniform float uSpecularStrength;
uniform float uShininess;

out vec4 fragColor;

void main() {
  vec3 base = uHasTexture ? texture(uTexture, vUV).rgb : uColor.rgb;
  vec3 N = normalize(vNormal);
  vec3 L = normalize(-uLightDirection);
  vec3 V = normalize(uCameraPosition - vWorldPos);
  vec3 H = normalize(L + V);

  vec3 ambient = uAmbientColor * uAmbientStrength * base;
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = uLightColor * diff * base;
  float spec = pow(max(dot(N, H), 0.0), uShininess);
  vec3 specular = uLightColor * spec * uSpecularStrength;

  fragColor = vec4(ambient + diffuse + specular, uColor.a);
}`,
}

// --- Post-Processing (fullscreen quad) ---

export const post = {
  /** Fullscreen quad vertex shader */
  quadVertex: `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vUV = aUV;
}`,

  /** Simple copy/blit fragment shader */
  copyFragment: `#version 300 es
${PRECISION}
in vec2 vUV;
uniform sampler2D uSource;
out vec4 fragColor;
void main() {
  fragColor = texture(uSource, vUV);
}`,

  /** Gaussian blur (single-pass, horizontal) */
  blurFragment: `#version 300 es
${PRECISION}
in vec2 vUV;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform int uDirection; // 0 = horizontal, 1 = vertical
out vec4 fragColor;

void main() {
  float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec2 offset = uDirection == 0 ? vec2(uTexelSize.x, 0.0) : vec2(0.0, uTexelSize.y);
  vec3 result = texture(uSource, vUV).rgb * weights[0];
  for (int i = 1; i < 5; i++) {
    result += texture(uSource, vUV + offset * float(i)).rgb * weights[i];
    result += texture(uSource, vUV - offset * float(i)).rgb * weights[i];
  }
  fragColor = vec4(result, 1.0);
}`,

  /** Tonemap (ACES filmic approximation) */
  tonemapFragment: `#version 300 es
${PRECISION}
in vec2 vUV;
uniform sampler2D uSource;
uniform float uExposure;
out vec4 fragColor;

vec3 aces(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 color = texture(uSource, vUV).rgb * uExposure;
  color = aces(color);
  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));
  fragColor = vec4(color, 1.0);
}`,

  /** Bloom bright-pass + blur composite */
  bloomFragment: `#version 300 es
${PRECISION}
in vec2 vUV;
uniform sampler2D uSource;
uniform sampler2D uBloom;
uniform float uBloomStrength;
out vec4 fragColor;

void main() {
  vec3 scene = texture(uSource, vUV).rgb;
  vec3 bloom = texture(uBloom, vUV).rgb;
  fragColor = vec4(scene + bloom * uBloomStrength, 1.0);
}`,
}

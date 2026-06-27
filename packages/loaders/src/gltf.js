/**
 * GLTF 2.0 Loader — Parses .gltf/.glb files with animation, skin, and morph support.
 *
 * Extracts meshes (PNU format), node hierarchy, animations (keyframe tracks),
 * skins (joint inverse bind matrices), and morph targets.
 *
 * @depends @uploop/math, @uploop/geometry
 */

import { vec3, vec4, quat, mat4 } from '@uploop/math'
import { Mesh, Formats } from '@uploop/geometry'

const GLB_MAGIC = 0x46546C67
const CHUNK_JSON = 0x4E4F534A
const CHUNK_BIN = 0x004E4942

const COMPONENT_SIZES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const COMPONENT_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }

/**
 * Parse GLTF JSON + binary buffer into a scene description.
 * @param {Object} json — GLTF JSON
 * @param {ArrayBuffer} [binary] — external or embedded binary
 * @returns {{ meshes: Object[], nodes: Object[], animations: Object[], skins: Object[] }}
 */
export function parseGLTF(json, binary) {
  const buf = binary ? new DataView(binary) : null

  // ── Accessor helper ─────────────────────────────────────────────
  function readAccessor(accessorIdx) {
    const acc = json.accessors[accessorIdx]
    const bv = json.bufferViews[acc.bufferView]
    if (!bv) throw new Error(`BufferView ${acc.bufferView} not found for accessor ${accessorIdx}`)

    const compType = acc.componentType
    const compCount = COMPONENT_COUNT[acc.type] || 1
    const byteSize = COMPONENT_SIZES[compType] || 4
    const stride = bv.byteStride || compCount * byteSize
    const count = acc.count
    const out = new Float32Array(count * compCount)
    const bvOff = bv.byteOffset || 0
    const accOff = acc.byteOffset || 0
    const bufLen = buf ? buf.byteLength : 0

    for (let i = 0; i < count; i++) {
      const off = bvOff + accOff + i * stride
      for (let c = 0; c < compCount; c++) {
        const bo = off + c * byteSize
        if (bo + byteSize > bufLen) {
          throw new Error(
            `Accessor ${accessorIdx}: offset ${bo} (byteSize ${byteSize}) exceeds buffer length ${bufLen} ` +
            `(count=${count}, stride=${stride}, bvOff=${bvOff}, accOff=${accOff}, i=${i}, c=${c})`
          )
        }
        let val = 0
        switch (compType) {
          case 5120: val = buf.getInt8(bo); break
          case 5121: val = buf.getUint8(bo); break
          case 5122: val = buf.getInt16(bo, true); break
          case 5123: val = buf.getUint16(bo, true); break
          case 5125: val = buf.getUint32(bo, true); break
          case 5126: val = buf.getFloat32(bo, true); break
          default: throw new Error(`Unknown componentType: ${compType}`)
        }
        out[i * compCount + c] = val
      }
    }
    return out
  }

  // ── Meshes ──────────────────────────────────────────────────────
  const meshes = []
  if (json.meshes) {
    for (const m of json.meshes) {
      for (const prim of m.primitives) {
        const posAcc = prim.attributes.POSITION != null ? readAccessor(prim.attributes.POSITION) : null
        const nrmAcc = prim.attributes.NORMAL != null ? readAccessor(prim.attributes.NORMAL) : null
        const uvAcc = prim.attributes.TEXCOORD_0 != null ? readAccessor(prim.attributes.TEXCOORD_0) : null
        const idxAcc = prim.indices != null ? readAccessor(prim.indices) : null

        if (!posAcc) continue

        const vCount = posAcc.length / 3
        const fmt = Formats.PNU
        const stride = fmt.stride / 4 // 8 floats per vertex
        const vertices = new Float32Array(vCount * stride)

        for (let i = 0; i < vCount; i++) {
          const bo = i * stride
          vertices[bo] = posAcc[i*3]; vertices[bo+1] = posAcc[i*3+1]; vertices[bo+2] = posAcc[i*3+2]
          if (nrmAcc) { vertices[bo+3] = nrmAcc[i*3]; vertices[bo+4] = nrmAcc[i*3+1]; vertices[bo+5] = nrmAcc[i*3+2] }
          if (uvAcc) { vertices[bo+6] = uvAcc[i*2]; vertices[bo+7] = 1 - uvAcc[i*2+1] } // flip Y
        }

        const idxArr = idxAcc ? new (vCount > 65535 ? Uint32Array : Uint16Array)(idxAcc) : undefined

        meshes.push({
          name: m.name || `mesh_${meshes.length}`,
          mesh: Mesh({ vertices, indices: idxArr, format: fmt }),
          joints: prim.attributes.JOINTS_0 != null ? readAccessor(prim.attributes.JOINTS_0) : null,
          weights: prim.attributes.WEIGHTS_0 != null ? readAccessor(prim.attributes.WEIGHTS_0) : null,
        })
      }
    }
  }

  // ── Nodes ───────────────────────────────────────────────────────
  const nodes = []
  if (json.nodes) {
    for (const n of json.nodes) {
      nodes.push({
        name: n.name || `node_${nodes.length}`,
        meshIndex: n.mesh ?? null,
        skinIndex: n.skin ?? null,
        children: n.children || [],
        translation: n.translation ? vec3.create(n.translation[0], n.translation[1], n.translation[2]) : vec3.create(),
        rotation: n.rotation ? vec4.set(new Float32Array(4), n.rotation[0], n.rotation[1], n.rotation[2], n.rotation[3]) : quat.create(),
        scale: n.scale ? vec3.create(...n.scale) : vec3.set(vec3.create(), 1, 1, 1),
      })
    }
  }

  // ── Animations ──────────────────────────────────────────────────
  const animations = []
  if (json.animations) {
    for (const anim of json.animations) {
      const channels = []
      for (const ch of anim.channels) {
        const sampler = anim.samplers[ch.sampler]
        const input = readAccessor(sampler.input)
        const output = readAccessor(sampler.output)
        channels.push({
          targetNode: ch.target.node,
          targetPath: ch.target.path, // 'translation'|'rotation'|'scale'
          times: input,
          values: output,
        })
      }
      animations.push({
        name: anim.name || `anim_${animations.length}`,
        channels,
      })
    }
  }

  // ── Skins ───────────────────────────────────────────────────────
  const skins = []
  if (json.skins) {
    for (const s of json.skins) {
      const joints = s.joints || []
      const ibm = s.inverseBindMatrices != null ? readAccessor(s.inverseBindMatrices) : null
      skins.push({ joints, inverseBindMatrices: ibm })
    }
  }

  return { meshes, nodes, animations, skins }
}

/**
 * Load binary GLB file from ArrayBuffer.
 * @param {ArrayBuffer} buffer
 * @returns {{ json: Object, binary: ArrayBuffer }}
 */
export function parseGLB(buffer) {
  const header = new DataView(buffer)
  if (header.getUint32(0, true) !== GLB_MAGIC) throw new Error('Not a GLB file')

  let offset = 12
  let json = null, binary = null

  while (offset < buffer.byteLength) {
    const chunkLength = header.getUint32(offset, true)
    const chunkType = header.getUint32(offset + 4, true)
    offset += 8

    if (chunkType === CHUNK_JSON) {
      const jsonBytes = new Uint8Array(buffer, offset, chunkLength)
      json = JSON.parse(new TextDecoder().decode(jsonBytes))
    } else if (chunkType === CHUNK_BIN) {
      binary = buffer.slice(offset, offset + chunkLength)
    }
    offset += chunkLength
  }

  return { json, binary: binary || new ArrayBuffer(0) }
}

/**
 * Decode base64 data URI to ArrayBuffer.
 */
function dataUriToBuffer(uri) {
  const b64 = uri.split(',')[1]
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buf
}

/**
 * Load multiple GLTF binary buffers, merge into one, and adjust bufferView offsets.
 * GLTF can have any number of external .bin / data-URI buffers.
 * We merge them sequentially so readAccessor uses a single DataView.
 */
async function loadAllBuffers(json, baseUrl, glbBinary) {
  if (!json.buffers?.length) return glbBinary || new ArrayBuffer(0)

  // If we already have a GLB binary (single buffer), use it directly
  if (glbBinary && json.buffers.length === 1) return glbBinary

  const chunks = []
  let total = 0
  for (const b of json.buffers) {
    let data
    if (b.uri) {
      if (b.uri.startsWith('data:')) {
        data = dataUriToBuffer(b.uri)
      } else {
        const fullUrl = new URL(b.uri, baseUrl).href
        const resp = await fetch(fullUrl)
        if (!resp.ok) throw new Error(`Failed to fetch buffer: ${b.uri} (${resp.status})`)
        data = await resp.arrayBuffer()
      }
    } else if (glbBinary) {
      // GLB embedded buffer — only one
      data = glbBinary
    }
    const size = data ? data.byteLength : 0
    chunks.push({ data, size, offset: total })
    total += size
  }

  // Single buffer case (already fetched) — no merge needed
  if (chunks.length === 1 && chunks[0].data) {
    return chunks[0].data
  }

  // Merge all buffers into one
  const merged = new ArrayBuffer(total)
  const mergedView = new Uint8Array(merged)
  for (const c of chunks) {
    if (c.data) mergedView.set(new Uint8Array(c.data), c.offset)
  }

  // Adjust bufferView offsets to merged space
  for (const bv of json.bufferViews) {
    if (bv.buffer != null) bv.byteOffset = (bv.byteOffset || 0) + chunks[bv.buffer].offset
  }

  return merged
}

/**
 * Fetch and parse a GLTF/GLB file from a URL.
 * @param {string} url
 * @returns {Promise<Object>}
 */
export async function loadGLTF(url) {
  const resp = await fetch(url)
  const buffer = await resp.arrayBuffer()

  // Detect GLB vs GLTF
  if (url.endsWith('.glb') || new DataView(buffer).getUint32(0, true) === GLB_MAGIC) {
    const { json, binary } = parseGLB(buffer)
    const merged = await loadAllBuffers(json, url, binary)
    return parseGLTF(json, merged)
  }

  // Plain GLTF (JSON + external .bin files)
  const json = JSON.parse(new TextDecoder().decode(buffer))
  const merged = await loadAllBuffers(json, url, null)
  return parseGLTF(json, merged)
}

export default { loadGLTF, parseGLTF, parseGLB }

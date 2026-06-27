/**
 * wams-math JS fallback — Same API as WASM, implemented in pure JS.
 *
 * Used when WASM unavailable or fallback='js-only'.
 * Delegates to Float32Array batch pattern.
 */
export function createMathJS(memory) {
  const buf = memory || new ArrayBuffer(64 * 1024)
  const f32 = new Float32Array(buf)

  return {
    memory: buf,
    vec3Add(o, a, b, n) { for (let i=0;i<n*3;i++) f32[o/4+i]=f32[a/4+i]+f32[b/4+i] },
    vec3Sub(o, a, b, n) { for (let i=0;i<n*3;i++) f32[o/4+i]=f32[a/4+i]-f32[b/4+i] },
    vec3Scale(o, p, s, n) { for (let i=0;i<n*3;i++) f32[o/4+i]=f32[p/4+i]*s },
    vec3DotBatch(o, a, b, n) { for (let i=0;i<n;i++){const A=i*3,B=i*3;f32[o/4+i]=f32[a/4+A]*f32[b/4+B]+f32[a/4+A+1]*f32[b/4+B+1]+f32[a/4+A+2]*f32[b/4+B+2]} },
    vec3CrossBatch(o, a, b, n) { for (let i=0;i<n;i++){const A=i*3,B=i*3,O=i*3;const ax=f32[a/4+A],ay=f32[a/4+A+1],az=f32[a/4+A+2],bx=f32[b/4+B],by=f32[b/4+B+1],bz=f32[b/4+B+2];f32[o/4+O]=ay*bz-az*by;f32[o/4+O+1]=az*bx-ax*bz;f32[o/4+O+2]=ax*by-ay*bx} },
    vec3LengthBatch(o, p, n) { for (let i=0;i<n;i++){const A=i*3;f32[o/4+i]=Math.sqrt(f32[p/4+A]**2+f32[p/4+A+1]**2+f32[p/4+A+2]**2)} },
    vec3NormalizeBatch(o, p, n) { for (let i=0;i<n;i++){const A=i*3;const x=f32[p/4+A],y=f32[p/4+A+1],z=f32[p/4+A+2];const l=Math.sqrt(x*x+y*y+z*z);const iv=l>1e-6?1/l:0;f32[o/4+A]=x*iv;f32[o/4+A+1]=y*iv;f32[o/4+A+2]=z*iv} },
    vec3LerpBatch(o, a, b, t, n) { for (let i=0;i<n*3;i++) f32[o/4+i]=f32[a/4+i]+(f32[b/4+i]-f32[a/4+i])*t },
    vec3TransformMat4Batch(o, ip, m, n) { for (let i=0;i<n;i++){const A=i*3;const x=f32[ip/4+A],y=f32[ip/4+A+1],z=f32[ip/4+A+2];f32[o/4+A]=f32[m/4]*x+f32[m/4+4]*y+f32[m/4+8]*z+f32[m/4+12];f32[o/4+A+1]=f32[m/4+1]*x+f32[m/4+5]*y+f32[m/4+9]*z+f32[m/4+13];f32[o/4+A+2]=f32[m/4+2]*x+f32[m/4+6]*y+f32[m/4+10]*z+f32[m/4+14]} },
    mat4Multiply(o, a, b) { for (let c=0;c<4;c++) for (let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=f32[a/4+k*4+r]*f32[b/4+c*4+k];f32[o/4+c*4+r]=s} },
    aabbUnion(o, a, b) { for (let i=0;i<3;i++){f32[o/4+i]=Math.min(f32[a/4+i],f32[b/4+i]);f32[o/4+i+3]=Math.max(f32[a/4+i+3],f32[b/4+i+3])} },
  }
}
export default { createMathJS }

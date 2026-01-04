import { useEffect, useRef, type JSX } from 'react'

type ShaderVariant = 'gradient' | 'waves' | 'plasma' | 'aurora'

interface ShaderBackgroundProps {
  variant?: ShaderVariant
}

const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Soft colorful gradient with vignette
const FRAG_GRADIENT = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / u_resolution.y;
  float t = u_time * 0.2;

  float r = 0.5 + 0.5 * sin(t + p.x * 10.0 + p.y * 5.0);
  float g = 0.5 + 0.5 * sin(t + p.x * 6.0 - p.y * 7.0 + 2.0);
  float b = 0.5 + 0.5 * sin(t + p.x * 3.0 + p.y * 2.0 + 4.0);
  vec3 color = vec3(r, g, b);

  float d = length(p);
  color *= 1.0 - smoothstep(0.4, 0.9, d);

  gl_FragColor = vec4(color, 1.0);
}
`

// Smooth rolling waves
const FRAG_WAVES = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.5;

  float wave1 = sin(uv.x * 3.0 + t) * 0.5 + 0.5;
  float wave2 = cos(uv.y * 2.0 - t * 0.7) * 0.5 + 0.5;
  float wave3 = sin((uv.x + uv.y) * 2.0 + t * 0.3) * 0.5 + 0.5;

  vec3 color = vec3(
    0.5 + 0.5 * sin(wave1 * 3.14),
    0.5 + 0.5 * cos(wave2 * 3.14 + 2.0),
    0.5 + 0.5 * sin(wave3 * 3.14 + 4.0)
  );

  gl_FragColor = vec4(color, 1.0);
}
`

// Energetic plasma effect
const FRAG_PLASMA = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / u_resolution.y;
  float t = u_time;

  float d1 = length(p - vec2(sin(t * 0.3), cos(t * 0.4)) * 0.3);
  float d2 = length(p - vec2(cos(t * 0.4), sin(t * 0.5)) * 0.3);
  float d3 = length(p - vec2(sin(t * 0.5), cos(t * 0.3)) * 0.3);

  float r = 0.5 + 0.5 * sin(5.0 / (d1 + 0.5) + t);
  float g = 0.5 + 0.5 * sin(5.0 / (d2 + 0.5) + t + 2.0);
  float b = 0.5 + 0.5 * sin(5.0 / (d3 + 0.5) + t + 4.0);

  vec3 color = vec3(r, g, b);
  gl_FragColor = vec4(color, 1.0);
}
`

// Northern lights aurora
const FRAG_AURORA = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.3;

  float streamer1 = sin(uv.y * 5.0 + t) * 0.5 + 0.5;
  float streamer2 = cos(uv.y * 3.0 - t * 0.8) * 0.5 + 0.5;
  float streamer3 = sin((uv.y - 0.5) * 4.0 + t * 0.6) * 0.5 + 0.5;

  float greenShift = uv.y * 0.5 + 0.3;
  float purpleShift = (1.0 - uv.y) * 0.5 + 0.2;

  vec3 color = vec3(
    purpleShift * streamer1,
    greenShift * streamer2,
    purpleShift * streamer3
  );

  color += vec3(0.1, 0.3, 0.2) * (streamer1 + streamer2 + streamer3) / 3.0;
  gl_FragColor = vec4(color, 1.0);
}
`

const SHADER_MAP: Record<ShaderVariant, string> = {
  gradient: FRAG_GRADIENT,
  waves: FRAG_WAVES,
  plasma: FRAG_PLASMA,
  aurora: FRAG_AURORA,
}

export default function ShaderBackground({ variant = 'gradient' }: ShaderBackgroundProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) return

    function compileShader(type: number, src: string) {
      const s = gl?.createShader(type)!
      gl?.shaderSource(s, src)
      gl?.compileShader(s)
      if (!gl?.getShaderParameter(s, gl?.COMPILE_STATUS)) {
        const info = gl?.getShaderInfoLog(s)
        gl?.deleteShader(s)
        throw new Error('Shader compile error: ' + info)
      }
      return s
    }

    const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC)
    const fragSource = SHADER_MAP[variant]
    const frag = compileShader(gl.FRAGMENT_SHADER, fragSource)

    const program = gl.createProgram()!
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error('Program link error: ' + info)
    }

    const posLoc = gl.getAttribLocation(program, 'a_position')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const resLoc = gl.getUniformLocation(program, 'u_resolution')

    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // two triangles to cover the viewport
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )

    gl.useProgram(program)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    function resize() {
      const dpr = window.devicePixelRatio || 1
      if (canvas) {
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
          gl?.viewport(0, 0, width, height)
        }
      }
    }

    const start = performance.now()
    function render(now: number) {
      if (!canvas) return;
      resize()
      const t = (now - start) / 1000
      if (timeLoc) gl?.uniform1f(timeLoc, t)
      if (resLoc) gl?.uniform2f(resLoc, canvas.width, canvas.height)
      gl?.drawArrays(gl?.TRIANGLES, 0, 6)
      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

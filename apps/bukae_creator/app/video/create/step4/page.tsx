'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Pause, Settings, Type, Music, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, TimelineData } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import SubtitleSelectionDialog from '@/components/SubtitleSelectionDialog'
import BgmSelectionDialog from '@/components/BgmSelectionDialog'
import TransitionEffectDialog from '@/components/TransitionEffectDialog'
import VoiceSelectionDialog from '@/components/VoiceSelectionDialog'

export default function Step4Page() {
  const router = useRouter()
  const { 
    scenes,
    selectedImages,
    timeline,
    setTimeline,
    subtitlePosition,
    subtitleFont,
    subtitleColor,
    bgmTemplate,
    transitionTemplate,
    voiceTemplate,
    setSubtitlePosition,
    setSubtitleFont,
    setSubtitleColor,
    setBgmTemplate,
    setTransitionTemplate,
    setVoiceTemplate,
    setScenes,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const texturesRef = useRef<Map<string, WebGLTexture>>(new Map())
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [transitionProgress, setTransitionProgress] = useState(0)
  const animationFrameRef = useRef<number | undefined>(undefined)

  // 씬 썸네일 계산
  const sceneThumbnails = useMemo(
    () =>
      scenes.map((scene, index) => scene.imageUrl || selectedImages[index] || ''),
    [scenes, selectedImages],
  )

  // 타임라인 초기화 및 갱신
  useEffect(() => {
    if (scenes.length === 0) return

    const nextTimeline: TimelineData = {
      fps: 30,
      resolution: '1080x1920',
      scenes: scenes.map((scene, index) => {
        // 기존 timeline이 있으면 기존 값 유지, 없으면 기본값 사용
        const existingScene = timeline?.scenes[index]
        return {
          sceneId: scene.sceneId,
          duration: existingScene?.duration || 2.5, // 기본 2.5초
          transition: existingScene?.transition || 'fade',
          image: scene.imageUrl || selectedImages[index] || '',
          text: {
            content: scene.script,
            font: subtitleFont || 'Pretendard-Bold',
            color: subtitleColor || '#ffffff',
            position: subtitlePosition || 'center',
            fontSize: existingScene?.text?.fontSize || 32,
          },
        }
      }),
    }
    setTimeline(nextTimeline)
  }, [scenes, selectedImages, subtitleFont, subtitleColor, subtitlePosition, setTimeline])

  // WebGL Shader 초기화
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = 1080
    canvas.height = 1920

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) {
      console.warn('WebGL not supported, falling back to Canvas 2D')
      return
    }

    glRef.current = gl

    // Vertex Shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `

    // Fragment Shader (전환 효과 포함)
    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture1;
      uniform sampler2D u_texture2;
      uniform float u_progress;
      uniform int u_transition;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;

      // Fade
      vec4 fade() {
        vec4 color1 = texture2D(u_texture1, v_texCoord);
        vec4 color2 = texture2D(u_texture2, v_texCoord);
        return mix(color1, color2, u_progress);
      }

      // Slide Left
      vec4 slideLeft() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        if (coord.x < u_progress) {
          return color2;
        }
        return color1;
      }

      // Slide Right
      vec4 slideRight() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        if (coord.x > 1.0 - u_progress) {
          return color2;
        }
        return color1;
      }

      // Slide Up
      vec4 slideUp() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        if (coord.y < u_progress) {
          return color2;
        }
        return color1;
      }

      // Slide Down
      vec4 slideDown() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        if (coord.y > 1.0 - u_progress) {
          return color2;
        }
        return color1;
      }

      // Zoom In
      vec4 zoomIn() {
        vec2 coord = v_texCoord;
        vec2 center = vec2(0.5, 0.5);
        vec2 offset = (coord - center) * (1.0 - u_progress);
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, center + offset);
        return mix(color1, color2, u_progress);
      }

      // Zoom Out
      vec4 zoomOut() {
        vec2 coord = v_texCoord;
        vec2 center = vec2(0.5, 0.5);
        vec2 offset = (coord - center) * u_progress;
        vec4 color1 = texture2D(u_texture1, center + offset);
        vec4 color2 = texture2D(u_texture2, coord);
        return mix(color1, color2, u_progress);
      }

      // Wipe Left
      vec4 wipeLeft() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        float edge = smoothstep(u_progress - 0.1, u_progress, coord.x);
        return mix(color1, color2, edge);
      }

      // Wipe Right
      vec4 wipeRight() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        float edge = smoothstep(1.0 - u_progress - 0.1, 1.0 - u_progress, coord.x);
        return mix(color1, color2, edge);
      }

      // Blur
      vec4 blur() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        float blurAmount = u_progress * 0.1;
        vec4 blurred1 = color1;
        vec4 blurred2 = color2;
        for (int i = -2; i <= 2; i++) {
          for (int j = -2; j <= 2; j++) {
            vec2 offset = vec2(float(i), float(j)) * blurAmount / u_resolution;
            blurred1 += texture2D(u_texture1, coord + offset);
            blurred2 += texture2D(u_texture2, coord + offset);
          }
        }
        blurred1 /= 25.0;
        blurred2 /= 25.0;
        return mix(blurred1, blurred2, u_progress);
      }

      // Glitch
      vec4 glitch() {
        vec2 coord = v_texCoord;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        float glitchAmount = sin(u_progress * 20.0) * 0.02;
        vec2 glitchCoord = coord + vec2(glitchAmount, 0.0);
        vec4 glitched = texture2D(u_texture2, glitchCoord);
        return mix(color1, glitched, u_progress);
      }

      // Rotate
      vec4 rotate() {
        vec2 coord = v_texCoord - 0.5;
        float angle = u_progress * 3.14159;
        float c = cos(angle);
        float s = sin(angle);
        vec2 rotated = vec2(
          coord.x * c - coord.y * s,
          coord.x * s + coord.y * c
        ) + 0.5;
        vec4 color1 = texture2D(u_texture1, v_texCoord);
        vec4 color2 = texture2D(u_texture2, rotated);
        return mix(color1, color2, u_progress);
      }

      // Pixelate
      vec4 pixelate() {
        vec2 coord = v_texCoord;
        float pixelSize = mix(1.0, 20.0, u_progress);
        vec2 pixelated = floor(coord * pixelSize) / pixelSize;
        vec4 color1 = texture2D(u_texture1, v_texCoord);
        vec4 color2 = texture2D(u_texture2, pixelated);
        return mix(color1, color2, u_progress);
      }

      // Wave
      vec4 wave() {
        vec2 coord = v_texCoord;
        float waveAmount = sin(coord.y * 10.0 + u_progress * 10.0) * 0.02 * u_progress;
        vec2 waved = coord + vec2(waveAmount, 0.0);
        vec4 color1 = texture2D(u_texture1, v_texCoord);
        vec4 color2 = texture2D(u_texture2, waved);
        return mix(color1, color2, u_progress);
      }

      // Ripple
      vec4 ripple() {
        vec2 coord = v_texCoord;
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(coord, center);
        float ripple = sin(dist * 20.0 - u_progress * 10.0) * 0.02 * u_progress;
        vec2 rippled = coord + normalize(coord - center) * ripple;
        vec4 color1 = texture2D(u_texture1, v_texCoord);
        vec4 color2 = texture2D(u_texture2, rippled);
        return mix(color1, color2, u_progress);
      }

      // Circle
      vec4 circle() {
        vec2 coord = v_texCoord;
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(coord, center);
        float radius = u_progress * 1.5;
        vec4 color1 = texture2D(u_texture1, coord);
        vec4 color2 = texture2D(u_texture2, coord);
        float edge = smoothstep(radius - 0.1, radius, dist);
        return mix(color1, color2, 1.0 - edge);
      }

      // Crossfade
      vec4 crossfade() {
        vec4 color1 = texture2D(u_texture1, v_texCoord);
        vec4 color2 = texture2D(u_texture2, v_texCoord);
        float eased = u_progress * u_progress * (3.0 - 2.0 * u_progress);
        return mix(color1, color2, eased);
      }

      void main() {
        if (u_transition == 0) gl_FragColor = fade();
        else if (u_transition == 1) gl_FragColor = slideLeft();
        else if (u_transition == 2) gl_FragColor = slideRight();
        else if (u_transition == 3) gl_FragColor = slideUp();
        else if (u_transition == 4) gl_FragColor = slideDown();
        else if (u_transition == 5) gl_FragColor = zoomIn();
        else if (u_transition == 6) gl_FragColor = zoomOut();
        else if (u_transition == 7) gl_FragColor = wipeLeft();
        else if (u_transition == 8) gl_FragColor = wipeRight();
        else if (u_transition == 9) gl_FragColor = blur();
        else if (u_transition == 10) gl_FragColor = glitch();
        else if (u_transition == 11) gl_FragColor = rotate();
        else if (u_transition == 12) gl_FragColor = pixelate();
        else if (u_transition == 13) gl_FragColor = wave();
        else if (u_transition == 14) gl_FragColor = ripple();
        else if (u_transition == 15) gl_FragColor = circle();
        else if (u_transition == 16) gl_FragColor = crossfade();
        else gl_FragColor = fade();
      }
    `

    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER)
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }

    programRef.current = program

    // Quad vertices
    const positions = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ])

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const positionLoc = gl.getAttribLocation(program, 'a_position')
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord')

    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(texCoordLoc)
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8)

    gl.useProgram(program)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }, [])

  // 텍스처 로드 함수
  const loadTexture = (gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> => {
    return new Promise((resolve, reject) => {
      if (texturesRef.current.has(url)) {
        resolve(texturesRef.current.get(url)!)
        return
      }

      const texture = gl.createTexture()
      if (!texture) {
        reject(new Error('Failed to create texture'))
        return
      }

      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        texturesRef.current.set(url, texture)
        resolve(texture)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
  }

  // 전환 효과 이름을 숫자로 매핑
  const getTransitionIndex = (transition: string): number => {
    const map: Record<string, number> = {
      fade: 0,
      'slide-left': 1,
      'slide-right': 2,
      'slide-up': 3,
      'slide-down': 4,
      'zoom-in': 5,
      'zoom-out': 6,
      'wipe-left': 7,
      'wipe-right': 8,
      blur: 9,
      glitch: 10,
      rotate: 11,
      pixelate: 12,
      wave: 13,
      ripple: 14,
      circle: 15,
      crossfade: 16,
    }
    return map[transition] ?? 0
  }

  // WebGL 렌더링 (WebGL 미지원 시 Canvas 2D fallback)
  useEffect(() => {
    if (!canvasRef.current || !timeline) return

    const canvas = canvasRef.current
    const scene = timeline.scenes[currentSceneIndex]
    if (!scene) return

    // WebGL이 지원되는 경우
    if (glRef.current && programRef.current) {
      const gl = glRef.current
      const program = programRef.current
      const nextSceneIndex = currentSceneIndex + 1
      const nextScene = timeline.scenes[nextSceneIndex]

      // 현재 씬과 다음 씬의 전환 진행도 계산
      const sceneStartTime = timeline.scenes
        .slice(0, currentSceneIndex)
        .reduce((acc, s) => acc + s.duration, 0)
      const sceneEndTime = sceneStartTime + scene.duration
      const transitionDuration = 0.3 // 전환 시간 0.3초
      const transitionStartTime = sceneEndTime - transitionDuration
      let progress = 0

      if (nextScene && currentTime >= transitionStartTime && currentTime <= sceneEndTime) {
        progress = (currentTime - transitionStartTime) / transitionDuration
        progress = Math.max(0, Math.min(1, progress))
      }

      setTransitionProgress(progress)

      const render = async () => {
        try {
          const texture1 = await loadTexture(gl, scene.image)
          const texture2 = nextScene ? await loadTexture(gl, nextScene.image) : texture1

          gl.useProgram(program)
          gl.clearColor(0, 0, 0, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)

          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, texture1)
          gl.uniform1i(gl.getUniformLocation(program, 'u_texture1'), 0)

          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, texture2)
          gl.uniform1i(gl.getUniformLocation(program, 'u_texture2'), 1)

          const transitionIndex = getTransitionIndex(scene.transition)
          gl.uniform1i(gl.getUniformLocation(program, 'u_transition'), transitionIndex)
          gl.uniform1f(gl.getUniformLocation(program, 'u_progress'), progress)
          gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), 1080, 1920)

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

          // 텍스트는 Canvas 2D로 오버레이
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            if (scene.text.content) {
              ctx.fillStyle = scene.text.color
              ctx.font = `${scene.text.fontSize || 32}px ${scene.text.font}`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'

              let textX = canvas.width / 2
              let textY = canvas.height / 2

              if (scene.text.position === 'top') {
                textY = 200
              } else if (scene.text.position === 'bottom') {
                textY = canvas.height - 200
              }

              ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
              ctx.shadowBlur = 10
              ctx.shadowOffsetX = 2
              ctx.shadowOffsetY = 2

              ctx.fillText(scene.text.content, textX, textY)

              ctx.shadowColor = 'transparent'
              ctx.shadowBlur = 0
              ctx.shadowOffsetX = 0
              ctx.shadowOffsetY = 0
            }
          }
        } catch (error) {
          console.error('WebGL render error:', error)
          // WebGL 실패 시 Canvas 2D로 fallback
          renderCanvas2D()
        }
      }

      render()
    } else {
      // WebGL 미지원 시 Canvas 2D로 렌더링
      renderCanvas2D()
    }

    function renderCanvas2D() {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 1080
      canvas.height = 1920

      if (scene.image) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // 이미지 그리기 (비율 유지)
          const imgAspect = img.width / img.height
          const canvasAspect = canvas.width / canvas.height

          let drawWidth = canvas.width
          let drawHeight = canvas.height
          let drawX = 0
          let drawY = 0

          if (imgAspect > canvasAspect) {
            drawHeight = canvas.width / imgAspect
            drawY = (canvas.height - drawHeight) / 2
          } else {
            drawWidth = canvas.height * imgAspect
            drawX = (canvas.width - drawWidth) / 2
          }

          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

          // 텍스트 오버레이
          if (scene.text.content) {
            ctx.fillStyle = scene.text.color
            ctx.font = `${scene.text.fontSize || 32}px ${scene.text.font}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            let textX = canvas.width / 2
            let textY = canvas.height / 2

            if (scene.text.position === 'top') {
              textY = 200
            } else if (scene.text.position === 'bottom') {
              textY = canvas.height - 200
            }

            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
            ctx.shadowBlur = 10
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2

            ctx.fillText(scene.text.content, textX, textY)

            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 0
          }
        }
        img.src = scene.image
      }
    }
  }, [timeline, currentSceneIndex, currentTime, transitionProgress])

  // 재생/일시정지
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Scene 클릭 시 해당 씬으로 이동
  const handleSceneSelect = (index: number) => {
    if (!timeline) return
    setCurrentSceneIndex(index)

    // 선택한 씬의 시작 시점으로 currentTime 이동
    const timeUntilScene = timeline.scenes
      .slice(0, index)
      .reduce((acc, scene) => acc + scene.duration, 0)
    setCurrentTime(timeUntilScene)
  }

  // 재생 루프
  useEffect(() => {
    if (!isPlaying || !timeline) return

    const totalDuration = timeline.scenes.reduce(
      (acc, scene) => acc + scene.duration,
      0,
    )

    let lastTimestamp: number | null = null

    const tick = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp
      }
      const deltaSeconds = (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp

      setCurrentTime((prev) => {
        let next = prev + deltaSeconds

        if (next >= totalDuration) {
          setIsPlaying(false)
          next = totalDuration
        }

        // 현재 시간에 해당하는 씬 인덱스 계산
        let accumulated = 0
        let sceneIndex = 0
        for (let i = 0; i < timeline.scenes.length; i++) {
          accumulated += timeline.scenes[i].duration
          if (next <= accumulated) {
            sceneIndex = i
            break
          }
        }
        setCurrentSceneIndex(sceneIndex)

        return next
      })

      if (animationFrameRef.current !== undefined && isPlaying) {
        animationFrameRef.current = requestAnimationFrame(tick)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, timeline])

  // 전체 재생 길이와 현재 위치 비율
  const progressRatio = useMemo(() => {
    if (!timeline || timeline.scenes.length === 0) return 0
    const total = timeline.scenes.reduce(
      (acc, scene) => acc + scene.duration,
      0,
    )
    if (total === 0) return 0
    return Math.min(1, currentTime / total)
  }, [timeline, currentTime])

  // 씬 스크립트 수정
  const handleSceneScriptChange = (index: number, value: string) => {
    const updatedScenes = scenes.map((scene, i) =>
      i === index ? { ...scene, script: value } : scene,
    )
    setScenes(updatedScenes)
    
    // 타임라인도 즉시 업데이트
    if (timeline) {
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) =>
          i === index
            ? { ...scene, text: { ...scene.text, content: value } }
            : scene,
        ),
      }
      setTimeline(nextTimeline)
    }
  }

  // 씬 전환 효과 수정
  const handleSceneTransitionChange = (index: number, value: string) => {
    if (!timeline) return
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) =>
        i === index ? { ...scene, transition: value } : scene,
      ),
    }
    setTimeline(nextTimeline)
  }

  // 씬 재생 시간(duration) 수정
  const handleSceneDurationChange = (index: number, value: number) => {
    if (!timeline) return
    const clampedValue = Math.max(0.5, Math.min(10, value)) // 0.5초 ~ 10초 제한
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) =>
        i === index ? { ...scene, duration: clampedValue } : scene,
      ),
    }
    setTimeline(nextTimeline)
    
    // 재생 중이면 현재 시간도 조정
    if (isPlaying) {
      const timeUntilScene = nextTimeline.scenes
        .slice(0, index)
        .reduce((acc, scene) => acc + scene.duration, 0)
      if (currentTime > timeUntilScene + clampedValue) {
        setCurrentTime(timeUntilScene + clampedValue)
      }
    }
  }

  // 타임라인 바 클릭/드래그로 위치 이동
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const timelineBarRef = useRef<HTMLDivElement>(null)

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline) return
    // 드래그 시작 시 재생 일시정지
    if (isPlaying) {
      setIsPlaying(false)
    }
    setIsDraggingTimeline(true)
    handleTimelineClick(e)
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline || !timelineBarRef.current) return
    
    const rect = timelineBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    
    const totalDuration = timeline.scenes.reduce(
      (acc, scene) => acc + scene.duration,
      0,
    )
    const targetTime = ratio * totalDuration
    
    setCurrentTime(targetTime)
    
    // 해당 시간에 맞는 씬 인덱스 계산
    let accumulated = 0
    let sceneIndex = 0
    for (let i = 0; i < timeline.scenes.length; i++) {
      accumulated += timeline.scenes[i].duration
      if (targetTime <= accumulated) {
        sceneIndex = i
        break
      }
    }
    setCurrentSceneIndex(sceneIndex)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingTimeline || !timeline || !timelineBarRef.current) return
      
      const rect = timelineBarRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const ratio = Math.max(0, Math.min(1, mouseX / rect.width))
      
      const totalDuration = timeline.scenes.reduce(
        (acc, scene) => acc + scene.duration,
        0,
      )
      const targetTime = ratio * totalDuration
      
      setCurrentTime(targetTime)
      
      // 해당 시간에 맞는 씬 인덱스 계산
      let accumulated = 0
      let sceneIndex = 0
      for (let i = 0; i < timeline.scenes.length; i++) {
        accumulated += timeline.scenes[i].duration
        if (targetTime <= accumulated) {
          sceneIndex = i
          break
        }
      }
      setCurrentSceneIndex(sceneIndex)
    }

    const handleMouseUp = () => {
      setIsDraggingTimeline(false)
    }

    if (isDraggingTimeline) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingTimeline, timeline])

  // 최종 영상 생성
  const handleGenerateVideo = async () => {
    if (!timeline) {
      alert('타임라인 데이터가 없습니다.')
      return
    }

    // TODO: 서버로 타임라인 데이터 전송
    // 서버에서 ffmpeg로 영상 생성
    alert('영상 생성 기능은 추후 구현 예정입니다.')
  }

  // 다음 단계로 이동
  const handleNext = () => {
    router.push('/video/create/step6')
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen justify-center"
    >
      <div className="flex w-full max-w-[1600px]">
        <StepIndicator />
        <div className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                미리보기 및 효과 선택
              </h1>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                왼쪽 미리보기에서 전체 흐름을 확인하고, 오른쪽에서 각 Scene의 자막과 효과를 편집하세요.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
              {/* 좌측: Canvas 미리보기 + 효과 */}
              <div className="space-y-4">
                {/* Canvas 미리보기 */}
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      실시간 미리보기
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden self-center">
                        <canvas
                          ref={canvasRef}
                          className="w-full max-w-[540px] h-auto bg-black"
                          style={{ aspectRatio: '9/16' }}
                        />
                      </div>
                      {/* 재생 바 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Scene {currentSceneIndex + 1} / {scenes.length || 0}</span>
                        </div>
                        <div
                          ref={timelineBarRef}
                          className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden cursor-pointer relative"
                          onMouseDown={handleTimelineMouseDown}
                        >
                          <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${progressRatio * 100}%` }}
                          />
                          {isDraggingTimeline && (
                            <div className="absolute inset-0 bg-purple-500/20" />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handlePlayPause}
                          variant="outline"
                          size="sm"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              일시정지
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              재생
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleGenerateVideo}
                          size="sm"
                        >
                          최종 영상 만들기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 효과 선택 */}
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      효과 선택
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 자막 선택 */}
                      <SubtitleSelectionDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Type className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              자막 선택
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </SubtitleSelectionDialog>

                      {/* 배경음악 선택 */}
                      <BgmSelectionDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Music className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              배경음악 선택
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </BgmSelectionDialog>

                      {/* 전환 효과 */}
                      <TransitionEffectDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Shuffle className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              전환 효과
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </TransitionEffectDialog>

                      {/* 목소리 선택 */}
                      <VoiceSelectionDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Settings className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              목소리 선택
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </VoiceSelectionDialog>
                    </div>
                  </CardContent>
                </Card>

                {/* 다음 단계 버튼 */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className="gap-2"
                  >
                    다음 단계
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* 우측: Scene 리스트 */}
              <div className="space-y-3">
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      Scene 리스트
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scenes.length === 0 ? (
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Step3에서 이미지와 스크립트를 먼저 생성해주세요.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {scenes.map((scene, index) => {
                          const thumb = sceneThumbnails[index]
                          const isActive = currentSceneIndex === index
                          const sceneTransition =
                            timeline?.scenes[index]?.transition ?? 'fade'
                          return (
                            <div
                              key={scene.sceneId ?? index}
                              className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                isActive
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : theme === 'dark'
                                    ? 'border-gray-700 bg-gray-900 hover:border-purple-500'
                                    : 'border-gray-200 bg-white hover:border-purple-500'
                              }`}
                              onClick={() => handleSceneSelect(index)}
                            >
                              <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={`Scene ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-xs font-semibold uppercase ${
                                    theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                                  }`}>
                                    Scene {index + 1}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <span className={`text-xs ${
                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                      }`}>
                                        시간:
                                      </span>
                                      <input
                                        type="number"
                                        min="0.5"
                                        max="10"
                                        step="0.1"
                                        value={timeline?.scenes[index]?.duration?.toFixed(1) || '2.5'}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value)
                                          if (!isNaN(value)) {
                                            handleSceneDurationChange(index, value)
                                          }
                                        }}
                                        className={`w-12 text-xs rounded-md border px-1 py-0.5 text-right ${
                                          theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                        } focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className={`text-xs ${
                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                      }`}>
                                        초
                                      </span>
                                    </div>
                                    <select
                                      value={sceneTransition}
                                      onChange={(e) =>
                                        handleSceneTransitionChange(index, e.target.value)
                                      }
                                      className={`text-xs rounded-md border px-2 py-1 bg-transparent ${
                                        theme === 'dark'
                                          ? 'border-gray-700 text-gray-200'
                                          : 'border-gray-300 text-gray-700'
                                      } focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="fade">Fade</option>
                                      <option value="slide-left">Slide Left</option>
                                      <option value="slide-right">Slide Right</option>
                                      <option value="slide-up">Slide Up</option>
                                      <option value="slide-down">Slide Down</option>
                                      <option value="zoom-in">Zoom In</option>
                                      <option value="zoom-out">Zoom Out</option>
                                      <option value="wipe-left">Wipe Left</option>
                                      <option value="wipe-right">Wipe Right</option>
                                      <option value="blur">Blur</option>
                                      <option value="glitch">Glitch</option>
                                      <option value="rotate">Rotate</option>
                                      <option value="pixelate">Pixelate</option>
                                      <option value="wave">Wave</option>
                                      <option value="ripple">Ripple</option>
                                      <option value="circle">Circle</option>
                                      <option value="crossfade">Crossfade</option>
                                    </select>
                                  </div>
                                </div>
                                <textarea
                                  rows={3}
                                  value={scene.script}
                                  onChange={(e) =>
                                    handleSceneScriptChange(index, e.target.value)
                                  }
                                  className={`w-full text-sm rounded-md border px-2 py-1 resize-none ${
                                    theme === 'dark'
                                      ? 'bg-gray-800 border-gray-700 text-white'
                                      : 'bg-white border-gray-300 text-gray-900'
                                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}


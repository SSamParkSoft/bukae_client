import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'

/**
 * 파티클 시스템을 생성합니다.
 * @param type 파티클 타입
 * @param count 파티클 개수
 * @param stageWidth 스테이지 너비
 * @param stageHeight 스테이지 높이
 * @param duration 애니메이션 지속 시간
 * @returns PIXI.Container
 */
export const createParticleSystem = (
  type: 'sparkle' | 'snow' | 'confetti' | 'stars',
  count: number,
  stageWidth: number,
  stageHeight: number,
  duration: number
): PIXI.Container => {
  const container = new PIXI.Container()
  const particles: PIXI.Graphics[] = []

  for (let i = 0; i < count; i++) {
    const particle = new PIXI.Graphics()
    
    switch (type) {
      case 'sparkle':
        // 반짝이는 별 모양 (수동으로 그리기)
        particle.beginFill(0xffffff, 1)
        const sparkleSize = 5
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5
          const x1 = Math.cos(angle) * sparkleSize
          const y1 = Math.sin(angle) * sparkleSize
          const x2 = Math.cos(angle + Math.PI / 5) * sparkleSize * 0.5
          const y2 = Math.sin(angle + Math.PI / 5) * sparkleSize * 0.5
          if (i === 0) {
            particle.moveTo(x1, y1)
          } else {
            particle.lineTo(x1, y1)
          }
          particle.lineTo(x2, y2)
        }
        particle.closePath()
        particle.endFill()
        break
      case 'snow':
        // 눈송이 (원)
        particle.beginFill(0xffffff, 0.8)
        particle.drawCircle(0, 0, 3)
        particle.endFill()
        break
      case 'confetti':
        // 컨페티 (사각형)
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]
        particle.beginFill(colors[Math.floor(Math.random() * colors.length)], 1)
        particle.drawRect(-5, -5, 10, 10)
        particle.endFill()
        break
      case 'stars':
        // 별 (수동으로 그리기)
        particle.beginFill(0xffff00, 1)
        const starSize = 4
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
          const x1 = Math.cos(angle) * starSize
          const y1 = Math.sin(angle) * starSize
          const x2 = Math.cos(angle + Math.PI / 5) * starSize * 0.5
          const y2 = Math.sin(angle + Math.PI / 5) * starSize * 0.5
          if (i === 0) {
            particle.moveTo(x1, y1)
          } else {
            particle.lineTo(x1, y1)
          }
          particle.lineTo(x2, y2)
        }
        particle.closePath()
        particle.endFill()
        break
    }

    // 랜덤 위치
    particle.x = Math.random() * stageWidth
    particle.y = Math.random() * stageHeight
    particle.alpha = 0
    particle.scale.set(0.5 + Math.random() * 0.5)

    container.addChild(particle)
    particles.push(particle)
  }

  // 파티클 애니메이션
  const tl = gsap.timeline()
  particles.forEach((particle, index) => {
    const delay = (index / count) * 0.1
    const horizontalDrift = (Math.random() - 0.5) * 50

    // 등장 애니메이션
    tl.to(particle, {
      alpha: 1,
      duration: 0.3,
      delay,
    }, 0)

    // 이동 애니메이션
    tl.to(particle, {
      y: stageHeight + 50,
      x: particle.x + horizontalDrift,
      rotation: Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1),
      duration: duration,
      delay,
      ease: 'none',
    }, 0)

    // 사라짐 애니메이션
    tl.to(particle, {
      alpha: 0,
      duration: 0.3,
      delay: delay + duration - 0.3,
    }, 0)
  })

  return container
}


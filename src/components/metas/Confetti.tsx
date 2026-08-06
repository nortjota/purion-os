'use client'

import { motion } from 'framer-motion'

const CORES = ['#C9A84C', '#22C55E', '#5B8FE8', '#A855F7', '#E8A838']

function particula(i: number) {
  const angulo = (i / 14) * Math.PI * 2
  const distancia = 40 + Math.random() * 30
  return {
    x: Math.cos(angulo) * distancia,
    y: Math.sin(angulo) * distancia - 10,
    cor: CORES[i % CORES.length],
    rotacao: Math.random() * 360,
  }
}

export function Confetti() {
  const particulas = Array.from({ length: 14 }, (_, i) => particula(i))

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 5 }}>
      {particulas.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: '50%', y: '50%', opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: `calc(50% + ${p.x}px)`, y: `calc(50% + ${p.y}px)`, opacity: 0, scale: 0.4, rotate: p.rotacao }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute', width: 6, height: 6, borderRadius: 2,
            background: p.cor,
          }}
        />
      ))}
    </div>
  )
}

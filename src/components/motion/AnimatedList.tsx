'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { spring } from './presets'

/**
 * Lista animada: itens entram com stagger sutil, reposicionam com layout ao filtrar
 * e saem com fade (ex.: pedido despachado sai da fila). Envolva os itens em <AnimatedItem>.
 */
export function AnimatedList({ children, gap = 10 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      <AnimatePresence initial>
        {children}
      </AnimatePresence>
    </div>
  )
}

export function AnimatedItem({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  const d = Math.min(index, 10) * 0.035
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16 } }}
      transition={{
        layout: spring,
        opacity: { duration: 0.25, delay: d },
        y: { ...spring, delay: d },
        scale: { ...spring, delay: d },
      }}
    >
      {children}
    </motion.div>
  )
}

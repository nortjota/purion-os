'use client'

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { itemVariants, tokenMs } from './presets'

type DivProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate'>

/**
 * Container de grade com entrada escalonada (staggerChildren = --stagger).
 * Os filhos diretos devem ser <StaggerItem>.
 */
export function Stagger({ children, delay = 0, ...rest }: DivProps & { delay?: number }) {
  const reduzir = useReducedMotion() ?? false
  return (
    <motion.div
      initial={reduzir ? false : 'hidden'}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: tokenMs('--stagger', 45) / 1000, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Item da grade: opacity 0→1, y 6→0, scale 0.96→1 (spring). */
export function StaggerItem({ children, ...rest }: Omit<HTMLMotionProps<'div'>, 'variants'>) {
  return (
    <motion.div variants={itemVariants} {...rest}>
      {children}
    </motion.div>
  )
}

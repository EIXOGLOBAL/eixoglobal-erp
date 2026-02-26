'use client'

import { useState, useEffect, useRef } from 'react'

export function useAnimatedCounter(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0)
  const startRef = useRef<number>(0)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = current
    startTimeRef.current = null

    function animate(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      const value = startRef.current + (target - startRef.current) * eased
      setCurrent(Math.round(value))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return current
}

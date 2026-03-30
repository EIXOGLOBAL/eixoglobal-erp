'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
  useLocale?: boolean
}

/**
 * Animated number counter for KPI cards
 * Counts from 0 to target value with easing
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  useLocale = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const previousValueRef = useRef(0)

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (easeOutCubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const currentValue = previousValueRef.current + (value - previousValueRef.current) * easeProgress

      setDisplayValue(Math.round(currentValue * Math.pow(10, decimals)) / Math.pow(10, decimals))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        previousValueRef.current = value
      }
    }

    startTimeRef.current = null
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration, decimals])

  const formattedValue = useLocale
    ? displayValue.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayValue.toFixed(decimals)

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}

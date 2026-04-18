'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function GlobalLoading() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const prevPathname = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Route changed — show loading briefly
      prevPathname.current = pathname
      setLoading(true)
      setProgress(0)

      // Animate progress
      let p = 0
      timerRef.current = setInterval(() => {
        p += Math.random() * 20 + 5
        if (p >= 90) p = 90
        setProgress(p)
      }, 100)

      // Complete after short delay
      const completeTimer = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        setProgress(100)
        setTimeout(() => {
          setLoading(false)
          setProgress(0)
        }, 200)
      }, 300)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        clearTimeout(completeTimer)
      }
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Carregando página"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

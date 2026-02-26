'use client'

import { useRouter } from 'next/navigation'
import { startTransition, type ReactNode, type MouseEvent } from 'react'

interface AnimatedLinkProps {
  href: string
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent) => void
}

export function AnimatedLink({ href, children, className, onClick }: AnimatedLinkProps) {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onClick?.(e)
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        startTransition(() => { router.push(href) })
      })
    } else {
      startTransition(() => { router.push(href) })
    }
  }

  return <a href={href} onClick={handleClick} className={className}>{children}</a>
}

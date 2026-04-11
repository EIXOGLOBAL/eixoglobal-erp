'use client'

import { cn } from '@/lib/utils'

interface KeyboardShortcutHintProps {
  /** Keys to display, e.g. ['Ctrl', 'N'] or ['⌘', 'S'] */
  keys: string[]
  className?: string
}

/**
 * Renders a compact, styled hint for a keyboard shortcut.
 *
 * @example
 * ```tsx
 * <Button>
 *   Novo
 *   <KeyboardShortcutHint keys={['Ctrl', 'N']} />
 * </Button>
 * ```
 */
export function KeyboardShortcutHint({ keys, className }: KeyboardShortcutHintProps) {
  return (
    <span
      className={cn(
        'ml-2 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground',
        className,
      )}
    >
      {keys.map((key, index) => (
        <kbd
          key={index}
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1',
            'font-sans text-[11px] font-medium leading-none text-muted-foreground',
          )}
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}

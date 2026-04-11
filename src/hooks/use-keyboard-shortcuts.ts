'use client'

import { useEffect, useCallback, useRef } from 'react'

export type Modifier = 'ctrl' | 'shift' | 'alt' | 'ctrl+shift' | 'ctrl+alt' | 'none'

export type ShortcutKey =
  | 'n' | 's' | 'f' | 'k' | 'p' | 'z' | 'y' | 'd' | 'e'
  | 'Enter' | 'Escape' | 'Delete' | 'Backspace'
  | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  | (string & {})

/**
 * Tags where keyboard shortcuts should NOT fire,
 * to avoid conflicts while the user is typing.
 */
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (INTERACTIVE_TAGS.has(target.tagName)) return true
  if (target.isContentEditable) return true
  return false
}

function matchesModifier(event: KeyboardEvent, modifier: Modifier): boolean {
  // On macOS, treat Cmd (metaKey) the same as Ctrl
  const ctrl = event.ctrlKey || event.metaKey

  switch (modifier) {
    case 'ctrl':
      return ctrl && !event.shiftKey && !event.altKey
    case 'shift':
      return event.shiftKey && !ctrl && !event.altKey
    case 'alt':
      return event.altKey && !ctrl && !event.shiftKey
    case 'ctrl+shift':
      return ctrl && event.shiftKey && !event.altKey
    case 'ctrl+alt':
      return ctrl && event.altKey && !event.shiftKey
    case 'none':
      return !ctrl && !event.shiftKey && !event.altKey
  }
}

/**
 * Hook to register a single keyboard shortcut.
 *
 * @param key      - The key to listen for (e.g. 'n', 'Escape')
 * @param modifier - Modifier combination ('ctrl', 'shift', 'alt', 'ctrl+shift', 'ctrl+alt', 'none')
 * @param callback - Function to call when the shortcut is triggered
 * @param enabled  - Whether the shortcut is active (default: true)
 *
 * @example
 * ```ts
 * useKeyboardShortcut('n', 'ctrl', () => router.push('/new'))
 * useKeyboardShortcut('Escape', 'none', () => setOpen(false))
 * useKeyboardShortcut('s', 'ctrl', handleSave, isDirty)
 * ```
 */
export function useKeyboardShortcut(
  key: ShortcutKey,
  modifier: Modifier,
  callback: () => void,
  enabled: boolean = true,
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      // Skip when user is typing in form fields
      if (modifier !== 'none' && isInteractiveElement(event.target)) {
        // Allow shortcuts with modifiers in inputs only for Escape
        if (key !== 'Escape') return
      }
      if (modifier === 'none' && isInteractiveElement(event.target)) {
        // For 'none' modifier, only Escape works inside inputs
        if (key !== 'Escape') return
      }

      const pressedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key

      if (pressedKey !== key.toLowerCase() && pressedKey !== key) return
      if (!matchesModifier(event, modifier)) return

      event.preventDefault()
      event.stopPropagation()
      callbackRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [key, modifier, enabled])
}

// ---------------------------------------------------------------------------
// Convenience: register multiple shortcuts at once
// ---------------------------------------------------------------------------

export type ShortcutDefinition = {
  key: ShortcutKey
  modifier: Modifier
  callback: () => void
  enabled?: boolean
}

/**
 * Register multiple keyboard shortcuts at once.
 *
 * @example
 * ```ts
 * useKeyboardShortcuts([
 *   { key: 'n', modifier: 'ctrl', callback: handleNew },
 *   { key: 's', modifier: 'ctrl', callback: handleSave, enabled: isDirty },
 *   { key: 'f', modifier: 'ctrl', callback: handleSearch },
 *   { key: 'Escape', modifier: 'none', callback: handleClose },
 * ])
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]): void {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue

        // Skip when user is typing in form fields (Escape always allowed)
        if (isInteractiveElement(event.target) && shortcut.key !== 'Escape') continue

        const pressedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key
        const targetKey = shortcut.key.toLowerCase()

        if (pressedKey !== targetKey && pressedKey !== shortcut.key) continue
        if (!matchesModifier(event, shortcut.modifier)) continue

        event.preventDefault()
        event.stopPropagation()
        shortcut.callback()
        return // Only fire the first matching shortcut
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

// ---------------------------------------------------------------------------
// Utility: format shortcut for display
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable label for a modifier, using macOS symbols when
 * the user is on macOS and plain text otherwise.
 *
 * @example
 * ```ts
 * getShortcutLabel('ctrl', 'n') // '⌘N' on macOS, 'Ctrl+N' on others
 * ```
 */
export function getShortcutLabel(modifier: Modifier, key: ShortcutKey): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)

  const keyLabel = key.length === 1 ? key.toUpperCase() : key

  if (modifier === 'none') return keyLabel

  const parts: string[] = []

  if (modifier.includes('ctrl')) {
    parts.push(isMac ? '\u2318' : 'Ctrl')
  }
  if (modifier.includes('shift')) {
    parts.push(isMac ? '\u21E7' : 'Shift')
  }
  if (modifier.includes('alt')) {
    parts.push(isMac ? '\u2325' : 'Alt')
  }

  parts.push(keyLabel)

  return isMac ? parts.join('') : parts.join('+')
}

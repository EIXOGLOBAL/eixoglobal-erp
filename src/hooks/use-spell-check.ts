'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { correctText, autoCapitalize, isExemptField } from '@/lib/spell-check-dictionary'

interface SpellCheckResult {
  correctedText: string
  corrections: Array<{ original: string; corrected: string; position: number }>
  isChecking: boolean
}

export function useSpellCheck(options?: {
  enabled?: boolean
  autoCorrectOnBlur?: boolean
  debounceMs?: number
  fieldName?: string
}) {
  // Default options
  const enabled = options?.enabled ?? true
  const autoCorrectOnBlur = options?.autoCorrectOnBlur ?? true
  const debounceMs = options?.debounceMs ?? 500
  const fieldName = options?.fieldName

  // If field is exempt, disable spell-check
  const isExempt = fieldName ? isExemptField(fieldName) : false
  const isActive = enabled && !isExempt

  const [corrections, setCorrections] = useState<SpellCheckResult['corrections']>([])
  const [isChecking, setIsChecking] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Check text using offline dictionary first
  const checkText = useCallback((text: string): SpellCheckResult => {
    if (!isActive || !text.trim()) {
      return { correctedText: text, corrections: [], isChecking: false }
    }

    const result = correctText(text)
    const capitalized = autoCapitalize(result.corrected)

    return {
      correctedText: capitalized !== result.corrected ? capitalized : result.corrected,
      corrections: result.changes,
      isChecking: false,
    }
  }, [isActive])

  // Debounced check for real-time feedback
  const debouncedCheck = useCallback((text: string) => {
    if (!isActive) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setIsChecking(true)
    debounceRef.current = setTimeout(() => {
      const result = checkText(text)
      setCorrections(result.corrections)
      setIsChecking(false)
    }, debounceMs)
  }, [isActive, checkText, debounceMs])

  // On blur: apply auto-correction
  const onBlurCorrect = useCallback((text: string): string => {
    if (!isActive || !autoCorrectOnBlur) return text
    const result = checkText(text)
    setCorrections(result.corrections)
    return result.correctedText
  }, [isActive, autoCorrectOnBlur, checkText])

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return {
    checkText,
    debouncedCheck,
    onBlurCorrect,
    corrections,
    isChecking,
    isActive,
  }
}

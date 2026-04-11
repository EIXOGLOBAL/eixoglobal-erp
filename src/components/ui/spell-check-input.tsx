'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { useSpellCheck } from '@/hooks/use-spell-check'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SpellCheckInputProps extends React.ComponentProps<typeof Input> {
  spellCheckEnabled?: boolean
  autoCorrectOnBlur?: boolean
  fieldName?: string
  onCorrectedChange?: (value: string) => void
}

const SpellCheckInput = React.forwardRef<HTMLInputElement, SpellCheckInputProps>(
  ({ spellCheckEnabled = true, autoCorrectOnBlur = true, fieldName, className, onCorrectedChange, onChange, onBlur, ...props }, ref) => {
    const { debouncedCheck, onBlurCorrect, corrections, isChecking, isActive } = useSpellCheck({
      enabled: spellCheckEnabled,
      autoCorrectOnBlur,
      fieldName,
    })

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      if (isActive) {
        debouncedCheck(e.target.value)
      }
    }, [onChange, isActive, debouncedCheck])

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      if (isActive && autoCorrectOnBlur && e.target.value) {
        const corrected = onBlurCorrect(e.target.value)
        if (corrected !== e.target.value) {
          // Create a synthetic event with corrected value
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )?.set
          nativeInputValueSetter?.call(e.target, corrected)
          e.target.dispatchEvent(new Event('input', { bubbles: true }))
          onCorrectedChange?.(corrected)
        }
      }
      onBlur?.(e)
    }, [onBlur, isActive, autoCorrectOnBlur, onBlurCorrect, onCorrectedChange])

    const hasCorrections = corrections.length > 0

    return (
      <div className="relative">
        <TooltipProvider>
          <Tooltip open={hasCorrections}>
            <TooltipTrigger asChild>
              <Input
                ref={ref}
                className={cn(
                  hasCorrections && 'border-amber-400 focus-visible:ring-amber-400/30',
                  isChecking && 'pr-8',
                  className,
                )}
                onChange={handleChange}
                onBlur={handleBlur}
                {...props}
              />
            </TooltipTrigger>
            {hasCorrections && (
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">Correções aplicadas:</p>
                {corrections.map((c, i) => (
                  <p key={i}>
                    <span className="text-red-400 line-through">{c.original}</span>
                    {' → '}
                    <span className="text-green-400">{c.corrected}</span>
                  </p>
                ))}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {isChecking && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>
    )
  }
)
SpellCheckInput.displayName = 'SpellCheckInput'

export { SpellCheckInput }

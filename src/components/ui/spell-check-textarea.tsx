'use client'

import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useSpellCheck } from '@/hooks/use-spell-check'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SpellCheckTextareaProps extends React.ComponentProps<typeof Textarea> {
  spellCheckEnabled?: boolean
  autoCorrectOnBlur?: boolean
  fieldName?: string
  onCorrectedChange?: (value: string) => void
}

const SpellCheckTextarea = React.forwardRef<HTMLTextAreaElement, SpellCheckTextareaProps>(
  ({ spellCheckEnabled = true, autoCorrectOnBlur = true, fieldName, className, onCorrectedChange, onChange, onBlur, ...props }, ref) => {
    const { debouncedCheck, onBlurCorrect, corrections, isChecking, isActive } = useSpellCheck({
      enabled: spellCheckEnabled,
      autoCorrectOnBlur,
      fieldName,
    })

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      if (isActive) {
        debouncedCheck(e.target.value)
      }
    }, [onChange, isActive, debouncedCheck])

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (isActive && autoCorrectOnBlur && e.target.value) {
        const corrected = onBlurCorrect(e.target.value)
        if (corrected !== e.target.value) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
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
              <Textarea
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
          <div className="absolute right-2 top-3">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>
    )
  }
)
SpellCheckTextarea.displayName = 'SpellCheckTextarea'

export { SpellCheckTextarea }

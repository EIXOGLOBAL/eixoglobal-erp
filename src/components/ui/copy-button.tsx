'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
    value: string
    className?: string
    size?: 'sm' | 'xs'
}

export function CopyButton({ value, className, size = 'sm' }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!value) return
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback para browsers mais antigos
            const ta = document.createElement('textarea')
            ta.value = value
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.focus()
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copiado!' : 'Copiar'}
            className={cn(
                'inline-flex items-center justify-center rounded transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
                size === 'xs' ? 'h-5 w-5' : 'h-6 w-6',
                copied && 'text-green-500 hover:text-green-500',
                className
            )}
        >
            {copied
                ? <Check className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                : <Copy className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            }
        </button>
    )
}

/** Wrapper para exibir um valor com botão de copiar ao lado */
interface CopyableValueProps {
    value: string
    display?: string      // texto exibido (se diferente do valor copiado)
    className?: string
    mono?: boolean        // fonte monospace (útil para IDs, CPF, CNPJ)
}

export function CopyableValue({ value, display, className, mono }: CopyableValueProps) {
    return (
        <span className={cn('inline-flex items-center gap-1 group', className)}>
            <span className={mono ? 'font-mono text-sm' : ''}>{display ?? value}</span>
            <CopyButton
                value={value}
                size="xs"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
        </span>
    )
}

'use client'

import { useState, useCallback } from 'react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { Button } from '@/components/ui/button'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { Plus } from 'lucide-react'

interface CreateShortcutProps {
  /** Label do botão (ex: "Novo Cliente") */
  label: string
  /** Renderiza o dialog controlado via open/onOpenChange */
  children: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => React.ReactNode
}

/**
 * Componente que combina botão de criação com atalho Ctrl+N.
 * Renderiza um botão com hint de atalho e abre o dialog via Ctrl+N.
 *
 * @example
 * ```tsx
 * <CreateShortcut label="Novo Cliente">
 *   {({ open, onOpenChange }) => (
 *     <ClientDialog companyId={id} open={open} onOpenChange={onOpenChange} />
 *   )}
 * </CreateShortcut>
 * ```
 */
export function CreateShortcut({ label, children }: CreateShortcutProps) {
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => {
    setOpen(true)
  }, [])

  useKeyboardShortcut('n', 'ctrl', handleOpen, !open)

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
        <KeyboardShortcutHint keys={['Ctrl', 'N']} />
      </Button>
      {children({ open, onOpenChange: setOpen })}
    </>
  )
}

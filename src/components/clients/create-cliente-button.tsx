'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { ClientDialog } from './client-dialog'

interface CreateClienteButtonProps {
  companyId: string
}

export function CreateClienteButton({ companyId }: CreateClienteButtonProps) {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  useKeyboardShortcut('n', 'ctrl', handleOpen, !open)

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Cliente
        <KeyboardShortcutHint keys={['Ctrl', 'N']} />
      </Button>
      <ClientDialog companyId={companyId} open={open} onOpenChange={setOpen} />
    </>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { ProjectDialog } from './project-dialog'

interface CreateProjetoButtonProps {
  companies: { id: string; name: string }[]
  clients: { id: string; displayName: string }[]
}

export function CreateProjetoButton({ companies, clients }: CreateProjetoButtonProps) {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  useKeyboardShortcut('n', 'ctrl', handleOpen, !open)

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Projeto
        <KeyboardShortcutHint keys={['Ctrl', 'N']} />
      </Button>
      <ProjectDialog companies={companies} clients={clients} open={open} onOpenChange={setOpen} />
    </>
  )
}

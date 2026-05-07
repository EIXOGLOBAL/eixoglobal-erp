'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { BudgetDialog, type ProjectOption } from './budget-dialog'

interface CreateOrcamentoButtonProps {
  companyId: string
  projects: ProjectOption[]
}

export function CreateOrcamentoButton({ companyId, projects }: CreateOrcamentoButtonProps) {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  useKeyboardShortcut('n', 'ctrl', handleOpen, !open)

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Orçamento
        <KeyboardShortcutHint keys={['Ctrl', 'N']} />
      </Button>
      <BudgetDialog companyId={companyId} projects={projects} open={open} onOpenChange={setOpen} />
    </>
  )
}

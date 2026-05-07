'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { ContractDialog } from './contract-dialog'

interface CreateContratoButtonProps {
  companyId: string
  projects: { id: string; name: string }[]
  contractors: { id: string; name: string }[]
}

export function CreateContratoButton({ companyId, projects, contractors }: CreateContratoButtonProps) {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  useKeyboardShortcut('n', 'ctrl', handleOpen, !open)

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Contrato
        <KeyboardShortcutHint keys={['Ctrl', 'N']} />
      </Button>
      <ContractDialog
        companyId={companyId}
        projects={projects}
        contractors={contractors}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

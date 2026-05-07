'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { SupplierDialog } from './supplier-dialog'

interface CreateFornecedorButtonProps {
  companyId: string
}

export function CreateFornecedorButton({ companyId }: CreateFornecedorButtonProps) {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  useKeyboardShortcut('n', 'ctrl', handleOpen, !open)

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Fornecedor
        <KeyboardShortcutHint keys={['Ctrl', 'N']} />
      </Button>
      <SupplierDialog companyId={companyId} open={open} onOpenChange={setOpen} />
    </>
  )
}

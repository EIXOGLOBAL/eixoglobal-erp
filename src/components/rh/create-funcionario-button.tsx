'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { EmployeeDialog } from './employee-dialog'

interface SalaryGradeOption {
  id: string
  name: string
  level: number
  baseSalary: number
}

interface CreateFuncionarioButtonProps {
  companyId: string
  salaryGrades: SalaryGradeOption[]
}

export function CreateFuncionarioButton({ companyId, salaryGrades }: CreateFuncionarioButtonProps) {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  useKeyboardShortcut('n', 'ctrl', handleOpen, !open)

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Funcionário
        <KeyboardShortcutHint keys={['Ctrl', 'N']} />
      </Button>
      <EmployeeDialog companyId={companyId} salaryGrades={salaryGrades} open={open} onOpenChange={setOpen} />
    </>
  )
}

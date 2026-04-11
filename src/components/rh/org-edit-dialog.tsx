'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { updateEmployeeDepartment, updateEmployeeManager } from '@/app/actions/employee-actions'
import { Loader2 } from 'lucide-react'

export interface OrgEmployee {
  id: string
  name: string
  role: string
  department?: string | null
  avatarUrl?: string | null
  managerId: string | null
}

interface OrgEditDialogProps {
  employee: OrgEmployee | null
  allEmployees: OrgEmployee[]
  departments: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrgEditDialog({
  employee,
  allEmployees,
  departments,
  open,
  onOpenChange,
}: OrgEditDialogProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedManager, setSelectedManager] = useState<string>('')

  // Sync local state when the dialog opens with a new employee
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && employee) {
      setSelectedDepartment(employee.department || '__none__')
      setSelectedManager(employee.managerId || '__none__')
    }
    onOpenChange(newOpen)
  }

  // Also sync when employee changes (in case dialog is already open)
  if (open && employee) {
    const expectedDept = employee.department || '__none__'
    const expectedMgr = employee.managerId || '__none__'
    if (selectedDepartment !== expectedDept && selectedDepartment === '') {
      setSelectedDepartment(expectedDept)
    }
    if (selectedManager !== expectedMgr && selectedManager === '') {
      setSelectedManager(expectedMgr)
    }
  }

  if (!employee) return null

  // Potential managers: everyone except the employee itself
  const managerOptions = allEmployees.filter(e => e.id !== employee.id)

  const handleSave = () => {
    startTransition(async () => {
      const newDept = selectedDepartment === '__none__' ? null : selectedDepartment
      const newManager = selectedManager === '__none__' ? null : selectedManager

      const deptChanged = (newDept || null) !== (employee.department || null)
      const mgrChanged = (newManager || null) !== (employee.managerId || null)

      if (!deptChanged && !mgrChanged) {
        onOpenChange(false)
        return
      }

      let hasError = false

      if (deptChanged) {
        const res = await updateEmployeeDepartment(employee.id, newDept)
        if (!res.success) {
          toast({ title: 'Erro', description: res.error, variant: 'destructive' })
          hasError = true
        }
      }

      if (mgrChanged && !hasError) {
        const res = await updateEmployeeManager(employee.id, newManager)
        if (!res.success) {
          toast({ title: 'Erro', description: res.error, variant: 'destructive' })
          hasError = true
        }
      }

      if (!hasError) {
        toast({ title: 'Atualizado', description: `Hierarquia de ${employee.name} atualizada com sucesso.` })
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Hierarquia</DialogTitle>
          <DialogDescription>
            Altere o departamento e/ou gestor de <strong>{employee.name}</strong> ({employee.role}).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Department */}
          <div className="grid gap-2">
            <Label htmlFor="org-dept">Departamento</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger id="org-dept" className="w-full">
                <SelectValue placeholder="Selecione o departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manager */}
          <div className="grid gap-2">
            <Label htmlFor="org-mgr">Gestor</Label>
            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger id="org-mgr" className="w-full">
                <SelectValue placeholder="Selecione o gestor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum (raiz)</SelectItem>
                {managerOptions.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {e.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

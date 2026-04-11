'use client'

import { useState, useCallback } from 'react'
import { OrgChart } from '@/components/rh/org-chart'
import { OrgEditDialog, type OrgEmployee } from '@/components/rh/org-edit-dialog'

interface OrgChartClientProps {
  employees: OrgEmployee[]
  departments: string[]
}

export function OrgChartClient({ employees, departments }: OrgChartClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<OrgEmployee | null>(null)

  const handleEditNode = useCallback(
    (id: string) => {
      const emp = employees.find(e => e.id === id) ?? null
      setSelectedEmployee(emp)
      setEditOpen(true)
    },
    [employees]
  )

  return (
    <>
      <OrgChart
        employees={employees.map(e => ({
          id: e.id,
          name: e.name,
          role: e.role,
          department: e.department,
          avatarUrl: e.avatarUrl,
          managerId: e.managerId,
        }))}
        onEditNode={handleEditNode}
      />
      <OrgEditDialog
        employee={selectedEmployee}
        allEmployees={employees}
        departments={departments}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

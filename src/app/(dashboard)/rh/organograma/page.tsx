import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OrgChartClient } from '@/components/rh/org-chart-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, GitBranch, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OrganogramaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = session.user as { id: string; role: string; companyId: string }
  if (!user.companyId) redirect('/dashboard')

  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      jobTitle: true,
      managerId: true,
      avatarUrl: true,
      department: true,
    },
    orderBy: { name: 'asc' },
  })

  const orgNodes = employees.map(e => ({
    id: e.id,
    name: e.name,
    role: e.jobTitle,
    department: e.department,
    avatarUrl: e.avatarUrl,
    managerId: e.managerId,
  }))

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[]
  const withoutManager = employees.filter(e => !e.managerId).length

  // Compute largest department
  const deptCounts: Record<string, number> = {}
  for (const e of employees) {
    const dept = e.department || 'Sem departamento'
    deptCounts[dept] = (deptCounts[dept] || 0) + 1
  }
  const largestDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <GitBranch className="h-8 w-8" />
          Organograma
        </h2>
        <p className="text-muted-foreground">
          Hierarquia e estrutura organizacional da empresa.
          Passe o mouse em um card e clique no icone de edicao para alterar departamento ou gestor.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">colaboradores ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">departamentos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Gestor</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withoutManager}</div>
            <p className="text-xs text-muted-foreground">
              de {employees.length} colaboradores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maior Departamento</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{largestDept ? largestDept[1] : 0}</div>
            <p className="text-xs text-muted-foreground truncate" title={largestDept?.[0]}>
              {largestDept ? largestDept[0] : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Org Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Estrutura Hierarquica</CardTitle>
          <CardDescription>
            Clique em um card com subordinados para expandir ou recolher a hierarquia.
            Colaboradores sem gestor aparecem como raiz.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <OrgChartClient employees={orgNodes} departments={departments} />
        </CardContent>
      </Card>
    </div>
  )
}

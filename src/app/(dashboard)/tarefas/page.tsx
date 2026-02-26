import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getWorkTasks, getDepartments, getWorkTaskLabels } from "@/app/actions/task-actions"
import { TasksClient } from "@/components/tarefas/tasks-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, AlertCircle, Clock, CheckCheck } from "lucide-react"

export default async function TarefasPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const user = session.user as { id: string; role: string; companyId: string }

  const [tasksResult, deptsResult, labelsResult, projects, companyUsers] = await Promise.all([
    getWorkTasks({}),
    getDepartments(),
    getWorkTaskLabels(),
    prisma.project.findMany({
      where: { companyId: user.companyId, status: { in: ["PLANNING", "IN_PROGRESS"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
  ])

  const tasks = tasksResult.success ? tasksResult.data : []
  const departments = deptsResult.success ? deptsResult.data : []
  const labels = labelsResult.success ? labelsResult.data : []

  const now = new Date()
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && !["DONE","CANCELLED"].includes(t.status)).length
  const done = tasks.filter(t => t.status === "DONE").length

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
        <p className="text-muted-foreground">Gerencie e acompanhe as tarefas da equipe.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">tarefas visíveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
            <p className="text-xs text-muted-foreground">em execução</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdue}</div>
            <p className="text-xs text-muted-foreground">precisam atenção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{done}</div>
            <p className="text-xs text-muted-foreground">finalizadas</p>
          </CardContent>
        </Card>
      </div>

      <TasksClient
        initialTasks={tasks}
        departments={departments}
        labels={labels}
        projects={projects}
        companyUsers={companyUsers}
        currentUserId={user.id}
        userRole={user.role}
      />
    </div>
  )
}

import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getWorkTaskById } from "@/app/actions/task-actions"
import { getDepartments, getWorkTaskLabels } from "@/app/actions/task-actions"
import { prisma } from "@/lib/prisma"
import { TaskDetailClient } from "@/components/tarefas/task-detail-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")
  const user = session.user as { id: string; role: string; companyId: string }

  const [taskResult, deptsResult, labelsResult, companyUsers] = await Promise.all([
    getWorkTaskById(id),
    getDepartments(),
    getWorkTaskLabels(),
    prisma.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!taskResult.success || !taskResult.data) {
    notFound()
  }

  const task = taskResult.data
  const departments = deptsResult.success ? deptsResult.data : []
  const labels = labelsResult.success ? labelsResult.data : []

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tarefas">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tarefas
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate max-w-[300px]">{task.title}</span>
      </div>
      <TaskDetailClient
        task={task}
        currentUserId={user.id}
        userRole={user.role}
        departments={departments}
        labels={labels}
        companyUsers={companyUsers}
      />
    </div>
  )
}

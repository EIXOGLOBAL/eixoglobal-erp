"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { KanbanBoard } from "./kanban-board"
import { TaskList } from "./task-list"
import { TaskDialog } from "./task-dialog"
import type { TaskCardData } from "./task-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LayoutGrid, List, Plus, Search } from "lucide-react"
import { STATUS_LABELS, PRIORITY_LABELS, type WorkTaskStatus, type WorkTaskPriority } from "@/lib/task-utils"

interface TasksClientProps {
  initialTasks: TaskCardData[]
  departments: { id: string; name: string }[]
  labels: { id: string; name: string; color: string }[]
  projects: { id: string; name: string }[]
  companyUsers: { id: string; name: string | null; email: string; avatarUrl: string | null }[]
  currentUserId: string
  userRole: string
}

type ViewMode = "kanban" | "list"

export function TasksClient({
  initialTasks, departments, labels, projects, companyUsers, currentUserId, userRole,
}: TasksClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskCardData[]>(initialTasks)
  const [view, setView] = useState<ViewMode>("kanban")
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterPriority, setFilterPriority] = useState("ALL")
  const [filterMyTasks, setFilterMyTasks] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<TaskCardData | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false
      if (filterMyTasks && !t.assignments.some(a => a.user.id === currentUserId)) return false
      return true
    })
  }, [tasks, search, filterStatus, filterPriority, filterMyTasks, currentUserId])

  function handleTaskClick(task: TaskCardData) {
    router.push(`/tarefas/${task.id}`)
  }

  function handleEditTask(task: TaskCardData) {
    setEditTask(task)
    setEditOpen(true)
  }

  function handleCreated(_: unknown) { window.location.reload() }
  function handleUpdated(_: unknown) { window.location.reload() }

  const activeFilters = [filterStatus !== "ALL", filterPriority !== "ALL", filterMyTasks].filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Buscar tarefas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Status</SelectItem>
            {(Object.keys(STATUS_LABELS) as WorkTaskStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as Prioridades</SelectItem>
            {(Object.keys(PRIORITY_LABELS) as WorkTaskPriority[]).map(p => (
              <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={filterMyTasks ? "default" : "outline"} size="sm" onClick={() => setFilterMyTasks(v => !v)} className="h-9">
          Minhas Tarefas
        </Button>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground"
            onClick={() => { setFilterStatus("ALL"); setFilterPriority("ALL"); setFilterMyTasks(false) }}>
            Limpar filtros
            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">{activeFilters}</Badge>
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">{filtered.length} tarefa(s)</span>
          <div className="flex items-center rounded-md border p-0.5 gap-0.5">
            <Button variant={view === "kanban" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("kanban")}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("list")}>
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard tasks={filtered} onTaskClick={handleTaskClick} onTasksReorder={setTasks} currentUserId={currentUserId} />
      ) : (
        <TaskList tasks={filtered} currentUserId={currentUserId} userRole={userRole} onEditTask={handleEditTask} onTaskClick={handleTaskClick} />
      )}

      <TaskDialog open={createOpen} onOpenChange={setCreateOpen} departments={departments} labels={labels} projects={projects} companyUsers={companyUsers as any} onCreated={handleCreated} />

      {editTask && (
        <TaskDialog open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) setEditTask(null) }}
          task={editTask as any} departments={departments} labels={labels} projects={projects}
          companyUsers={companyUsers as any} onUpdated={handleUpdated} />
      )}
    </div>
  )
}

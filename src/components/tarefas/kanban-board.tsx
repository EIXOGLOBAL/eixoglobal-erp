'use client'
import { useRouter } from 'next/navigation'

import { useState, useTransition } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { moveWorkTask, createWorkTask } from "@/app/actions/task-actions"
import { useToast } from "@/hooks/use-toast"
import { KANBAN_COLUMNS } from "@/lib/task-utils"
import { TaskCard, type TaskCardData } from "./task-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface KanbanBoardProps {
  tasks: TaskCardData[]
  onTaskClick: (task: TaskCardData) => void
  onTasksReorder: (tasks: TaskCardData[]) => void
  currentUserId: string
}

export function KanbanBoard({
  tasks, onTaskClick, onTasksReorder, currentUserId }: KanbanBoardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [, startTransition] = useTransition()
  const [quickCreate, setQuickCreate] = useState<string | null>(null)
  const [quickTitle, setQuickTitle] = useState("")
  const [creating, setCreating] = useState(false)

  function getColTasks(status: string): TaskCardData[] {
    return tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order)
  }

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    const optimistic = tasks.map(t =>
      t.id === draggableId ? { ...t, status: newStatus, order: destination.index } : t
    )
    onTasksReorder(optimistic)

    startTransition(async () => {
      const res = await moveWorkTask(draggableId, newStatus, destination.index)
      if (!res.success) {
        toast({ variant: "destructive", title: "Erro ao mover", description: res.error })
        onTasksReorder(tasks)
      }
    })
  }

  async function handleQuickCreate(status: string) {
    if (!quickTitle.trim() || creating) return
    setCreating(true)
    const res = await createWorkTask({
      title: quickTitle.trim(),
      status: status as "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED",
      priority: "NONE",
      assigneeIds: [],
      labelIds: [],
    })
    setCreating(false)
    if (res.success) {
      setQuickCreate(null)
      setQuickTitle("")
      router.refresh()
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error })
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-0">
        {KANBAN_COLUMNS.map(col => {
          const colTasks = getColTasks(col.id)
          const isCreating = quickCreate === col.id
          return (
            <div key={col.id} className="shrink-0 w-[272px]">
              <div className={cn("flex items-center justify-between px-3 py-2 rounded-t-lg", col.headerBg)}>
                <span className="text-sm font-semibold">{col.label}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1">{colTasks.length}</Badge>
                  <Button
                    variant="ghost" size="icon" aria-label="Adicionar" className="h-5 w-5"
                    onClick={() => { setQuickCreate(col.id); setQuickTitle("") }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {isCreating && (
                <div className={cn("px-2 py-2 border-x", col.bgColor)}>
                  <Input
                    autoFocus
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleQuickCreate(col.id)
                      if (e.key === "Escape") setQuickCreate(null)
                    }}
                    placeholder="Nome da tarefa... (Enter para criar)"
                    className="h-7 text-sm mb-1"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs px-2" disabled={creating} onClick={() => handleQuickCreate(col.id)}>
                      {creating ? "..." : "Criar"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setQuickCreate(null)} aria-label="Fechar">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[120px] p-2 rounded-b-lg border border-t-0 space-y-2 transition-colors",
                      col.bgColor,
                      snapshot.isDraggingOver && "ring-2 ring-inset ring-primary/50"
                    )}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                            <TaskCard
                              task={task}
                              onClick={() => onTaskClick(task)}
                              isDragging={snap.isDragging}
                              currentUserId={currentUserId}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {!isCreating && (
                      <button
                        onClick={() => { setQuickCreate(col.id); setQuickTitle("") }}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground rounded px-2 py-1 hover:bg-muted/50 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Adicionar tarefa
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}

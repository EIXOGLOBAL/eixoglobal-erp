'use client'

import { cn } from "@/lib/utils"
import { PRIORITY_DOT, formatDueDate, getInitials } from "@/lib/task-utils"
import { MessageSquare, CheckSquare } from "lucide-react"

type Assignment = { user: { id: string; name: string | null; avatarUrl: string | null } }
type Label = { label: { id: string; name: string; color: string } }
type Subtask = { id: string; done: boolean }

export interface TaskCardData {
  id: string
  title: string
  priority: string
  dueDate: Date | null
  status: string
  order: number
  assignments: Assignment[]
  labels: Label[]
  subtasks: Subtask[]
  project: { id: string; name: string } | null
  _count: { comments: number; subtasks: number }
}

interface TaskCardProps {
  task: TaskCardData
  onClick: () => void
  isDragging?: boolean
  currentUserId: string
}

export function TaskCard({ task, onClick, isDragging, currentUserId }: TaskCardProps) {
  const dueInfo = formatDueDate(task.dueDate)
  const priority = task.priority as keyof typeof PRIORITY_DOT
  const doneSubs = task.subtasks.filter(s => s.done).length
  const totalSubs = task._count.subtasks
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !["DONE","CANCELLED"].includes(task.status)

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg border p-3 cursor-pointer select-none",
        "hover:shadow-md hover:border-primary/40 transition-all duration-150",
        isDragging && "shadow-lg rotate-1 opacity-90 border-primary",
        isOverdue && "border-l-2 border-l-red-500",
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn("w-2 h-2 rounded-full mt-[5px] shrink-0", PRIORITY_DOT[priority] ?? "bg-gray-300")} />
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</p>
      </div>

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-4">
          {task.labels.slice(0, 3).map(l => (
            <span
              key={l.label.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium leading-none"
              style={{ backgroundColor: l.label.color }}
            >
              {l.label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      {task.project && (
        <p className="text-[10px] text-muted-foreground mt-1 ml-4 truncate">Proj: {task.project.name}</p>
      )}

      <div className="flex items-center justify-between mt-2 ml-4">
        <div className="flex items-center gap-2 text-[10px]">
          {dueInfo && <span className={dueInfo.cls}>{dueInfo.label}</span>}
          {task._count.comments > 0 && (
            <span className="text-muted-foreground flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />{task._count.comments}
            </span>
          )}
          {totalSubs > 0 && (
            <span className={cn("flex items-center gap-0.5",
              doneSubs === totalSubs ? "text-green-600" : "text-muted-foreground"
            )}>
              <CheckSquare className="h-2.5 w-2.5" />{doneSubs}/{totalSubs}
            </span>
          )}
        </div>
        <div className="flex -space-x-1">
          {task.assignments.slice(0, 3).map(a => (
            <div
              key={a.user.id}
              title={a.user.name ?? ""}
              className={cn(
                "w-5 h-5 rounded-full border border-background flex items-center justify-center text-[9px] font-bold overflow-hidden",
                a.user.id === currentUserId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
            >
              {a.user.avatarUrl
                ? <img src={a.user.avatarUrl} alt={a.user.name ?? ""} className="w-full h-full object-cover" />
                : getInitials(a.user.name)
              }
            </div>
          ))}
          {task.assignments.length > 3 && (
            <div className="w-5 h-5 rounded-full border border-background bg-muted flex items-center justify-center text-[9px]">
              +{task.assignments.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

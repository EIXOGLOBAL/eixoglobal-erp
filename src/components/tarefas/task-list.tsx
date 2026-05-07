'use client'
import { useRouter } from 'next/navigation'

import { useState } from "react"
import Link from "next/link"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { deleteWorkTask } from "@/app/actions/task-actions"
import { PRIORITY_DOT, PRIORITY_LABELS, STATUS_LABELS, formatDueDate, getInitials } from "@/lib/task-utils"
import { cn } from "@/lib/utils"
import type { TaskCardData } from "./task-card"

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  BACKLOG: "secondary",
  TODO: "outline",
  IN_PROGRESS: "default",
  IN_REVIEW: "default",
  DONE: "secondary",
  CANCELLED: "destructive",
}

interface TaskListProps {
  tasks: TaskCardData[]
  currentUserId: string
  userRole: string
  onEditTask: (task: TaskCardData) => void
  onTaskClick: (task: TaskCardData) => void
}

export function TaskList({
  tasks, currentUserId, userRole, onEditTask, onTaskClick }: TaskListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteWorkTask(deleteTarget)
    setDeleting(false)
    if (res.success) {
      toast({ title: "Tarefa excluída" })
      setDeleteTarget(null)
      router.refresh()
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error })
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">P</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28">Prazo</TableHead>
              <TableHead className="w-32">Responsáveis</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => {
              const dueInfo = formatDueDate(task.dueDate)
              const priority = task.priority as keyof typeof PRIORITY_DOT
              return (
                <TableRow key={task.id} className="group">
                  <TableCell>
                    <div className={cn("w-2.5 h-2.5 rounded-full", PRIORITY_DOT[priority] ?? "bg-gray-300")}
                      title={PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? task.priority}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-left hover:underline font-medium text-sm"
                      onClick={() => onTaskClick(task)}
                    >
                      {task.title}
                    </button>
                    {task.project && (
                      <p className="text-xs text-muted-foreground">{task.project.name}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[task.status] ?? "outline"} className="text-xs">
                      {STATUS_LABELS[task.status as keyof typeof STATUS_LABELS] ?? task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {dueInfo && <span className={cn("text-xs", dueInfo.cls)}>{dueInfo.label}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-1">
                      {task.assignments.slice(0, 3).map(a => (
                        <div
                          key={a.user.id}
                          title={a.user.name ?? ""}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold overflow-hidden",
                            a.user.id === currentUserId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                          )}
                        >
                          {a.user.avatarUrl
                            ? <img src={a.user.avatarUrl} alt={a.user.name ?? ""} className="w-full h-full object-cover" />
                            : getInitials(a.user.name)
                          }
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" aria-label="Abrir menu de ações">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onTaskClick(task)}>
                          <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(task.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

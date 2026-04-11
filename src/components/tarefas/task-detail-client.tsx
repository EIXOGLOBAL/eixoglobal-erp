'use client'

import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updateWorkTask, addWorkTaskComment, deleteWorkTaskComment,
  addSubtask, toggleSubtask, deleteSubtask,
} from "@/app/actions/task-actions"
import { useToast } from "@/hooks/use-toast"
import {
  STATUS_LABELS, PRIORITY_LABELS, PRIORITY_DOT,
  formatDueDate, getInitials,
  type WorkTaskStatus, type WorkTaskPriority,
} from "@/lib/task-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckSquare, MessageSquare, Clock, User, Tag,
  Folder, Building2, Plus, Trash2, Send, Activity,
} from "lucide-react"

import { formatDate } from "@/lib/formatters"
type TaskDetail = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  projectId: string | null
  departmentId: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: { id: string; name: string | null } | null
  project: { id: string; name: string } | null
  department: { id: string; name: string } | null
  assignments: { user: { id: string; name: string | null; email: string; avatarUrl: string | null } }[]
  labels: { label: { id: string; name: string; color: string } }[]
  subtasks: { id: string; title: string; done: boolean; order: number }[]
  comments: {
    id: string
    content: string
    createdAt: Date
    authorId: string
    author: { id: string; name: string | null; email: string; avatarUrl: string | null }
  }[]
  activities: {
    id: string
    type: string
    field: string | null
    oldValue: string | null
    newValue: string | null
    createdAt: Date
    user: { id: string; name: string | null }
  }[]
}

interface TaskDetailClientProps {
  task: TaskDetail
  currentUserId: string
  userRole: string
  departments: { id: string; name: string }[]
  labels: { id: string; name: string; color: string }[]
  companyUsers: { id: string; name: string | null; email: string; avatarUrl: string | null }[]
}

function ActivityLabel(type: string): string {
  const map: Record<string, string> = {
    CREATED: "criou a tarefa",
    STATUS_CHANGED: "mudou o status",
    PRIORITY_CHANGED: "mudou a prioridade",
    COMMENT_ADDED: "adicionou um comentário",
  }
  return map[type] ?? type
}

export function TaskDetailClient({
  task: initialTask, currentUserId, userRole, departments, labels, companyUsers,
}: TaskDetailClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [task, setTask] = useState(initialTask)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(task.title)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(task.description ?? "")

  const [newSubtask, setNewSubtask] = useState("")
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  async function saveField(field: string, value: unknown) {
    const res = await updateWorkTask(task.id, { [field]: value } as any)
    if (res.success) {
      setTask(prev => ({ ...prev, [field]: value }))
      router.refresh()
    } else {
      toast({ variant: "destructive", title: "Erro ao salvar", description: res.error })
    }
  }

  async function handleTitleBlur() {
    setEditingTitle(false)
    if (titleValue.trim() && titleValue !== task.title) {
      await saveField("title", titleValue.trim())
    }
  }

  async function handleDescBlur() {
    setEditingDesc(false)
    if (descValue !== (task.description ?? "")) {
      await saveField("description", descValue || null)
    }
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return
    setAddingSubtask(true)
    const res = await addSubtask(task.id, newSubtask.trim())
    setAddingSubtask(false)
    if (res.success) {
      setTask(prev => ({ ...prev, subtasks: [...prev.subtasks, res.data] }))
      setNewSubtask("")
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error })
    }
  }

  async function handleToggleSubtask(subtaskId: string) {
    const res = await toggleSubtask(subtaskId)
    if (res.success) {
      setTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.map(s => s.id === subtaskId ? { ...s, done: res.data.done } : s),
      }))
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const res = await deleteSubtask(subtaskId)
    if (res.success) {
      setTask(prev => ({ ...prev, subtasks: prev.subtasks.filter(s => s.id !== subtaskId) }))
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error })
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return
    setSubmittingComment(true)
    const res = await addWorkTaskComment(task.id, commentText.trim())
    setSubmittingComment(false)
    if (res.success) {
      setTask(prev => ({ ...prev, comments: [...prev.comments, res.data as any] }))
      setCommentText("")
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error })
    }
  }

  async function handleDeleteComment(commentId: string) {
    const res = await deleteWorkTaskComment(commentId)
    if (res.success) {
      setTask(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }))
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error })
    }
  }

  const doneSubtasks = task.subtasks.filter(s => s.done).length
  const totalSubtasks = task.subtasks.length
  const dueInfo = formatDueDate(task.dueDate)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Title */}
        <div>
          {editingTitle ? (
            <Input
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={e => { if (e.key === "Enter") handleTitleBlur() }}
              className="text-2xl font-bold h-auto py-1"
            />
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1"
              onClick={() => setEditingTitle(true)}
            >
              {task.title}
            </h1>
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
          {editingDesc ? (
            <Textarea
              autoFocus
              value={descValue}
              onChange={e => setDescValue(e.target.value)}
              onBlur={handleDescBlur}
              rows={4}
              placeholder="Adicione uma descrição..."
              className="resize-none"
            />
          ) : (
            <div
              className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 min-h-[60px]"
              onClick={() => setEditingDesc(true)}
            >
              {task.description || <span className="italic">Clique para adicionar uma descrição...</span>}
            </div>
          )}
        </div>

        <Separator />

        {/* Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Subtarefas
              {totalSubtasks > 0 && (
                <Badge variant="secondary" className="text-xs">{doneSubtasks}/{totalSubtasks}</Badge>
              )}
            </h3>
          </div>
          {totalSubtasks > 0 && (
            <div className="w-full bg-muted rounded-full h-1.5 mb-3">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(doneSubtasks / totalSubtasks) * 100}%` }}
              />
            </div>
          )}
          <div className="space-y-1.5">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 group">
                <Checkbox
                  checked={sub.done}
                  onCheckedChange={() => handleToggleSubtask(sub.id)}
                />
                <span className={cn("text-sm flex-1", sub.done && "line-through text-muted-foreground")}>
                  {sub.title}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={() => handleDeleteSubtask(sub.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddSubtask() }}
              placeholder="Adicionar subtarefa..."
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8" disabled={addingSubtask || !newSubtask.trim()} onClick={handleAddSubtask}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Comments */}
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4" />
            Comentários ({task.comments.length})
          </h3>
          <div className="space-y-3">
            {task.comments.map(comment => (
              <div key={comment.id} className="flex gap-3 group">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                  {comment.author.avatarUrl
                    ? <img src={comment.author.avatarUrl} alt={comment.author.name ?? ""} className="w-full h-full object-cover" />
                    : getInitials(comment.author.name)
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                    {(comment.authorId === currentUserId || userRole === "ADMIN") && (
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 ml-auto"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              rows={2}
              className="resize-none"
            />
            <Button size="icon" disabled={submittingComment || !commentText.trim()} onClick={handleAddComment}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <Select
                value={task.status}
                onValueChange={val => saveField("status", val)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as WorkTaskStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Prioridade</p>
              <Select
                value={task.priority}
                onValueChange={val => saveField("priority", val)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as WorkTaskPriority[]).map(p => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Prazo
              </p>
              <Input
                type="date"
                className="h-8 text-sm"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                onChange={e => saveField("dueDate", e.target.value || null)}
              />
              {dueInfo && <p className={cn("text-xs mt-1", dueInfo.cls)}>{dueInfo.label}</p>}
            </div>

            {/* Assignees */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <User className="h-3 w-3" /> Responsáveis
              </p>
              <div className="space-y-1">
                {task.assignments.map(a => (
                  <div key={a.user.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      {a.user.avatarUrl
                        ? <img src={a.user.avatarUrl} alt={a.user.name ?? ""} className="w-full h-full object-cover" />
                        : getInitials(a.user.name)
                      }
                    </div>
                    <span className="truncate">{a.user.name}</span>
                  </div>
                ))}
                {task.assignments.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum responsável</p>
                )}
              </div>
            </div>

            {/* Project */}
            {task.project && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Folder className="h-3 w-3" /> Projeto
                </p>
                <p className="text-sm">{task.project.name}</p>
              </div>
            )}

            {/* Department */}
            {task.department && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Departamento
                </p>
                <p className="text-sm">{task.department.name}</p>
              </div>
            )}

            {/* Labels */}
            {task.labels.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Etiquetas
                </p>
                <div className="flex flex-wrap gap-1">
                  {task.labels.map(l => (
                    <span
                      key={l.label.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: l.label.color }}
                    >
                      {l.label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created */}
            <div>
              <p className="text-xs text-muted-foreground">
                Criado por {task.createdBy?.name ?? "—"} em{" "}
                {formatDate(task.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Activity */}
        {task.activities.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {task.activities.map(act => (
                  <div key={act.id} className="flex gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                    <div>
                      <span className="font-medium">{act.user.name}</span>{" "}
                      <span className="text-muted-foreground">{ActivityLabel(act.type)}</span>
                      {act.oldValue && act.newValue && (
                        <span className="text-muted-foreground">: {act.oldValue} → {act.newValue}</span>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(act.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

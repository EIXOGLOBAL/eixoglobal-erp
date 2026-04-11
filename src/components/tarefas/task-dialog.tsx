'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { createWorkTask, updateWorkTask } from "@/app/actions/task-actions"
import { STATUS_LABELS, PRIORITY_LABELS, type WorkTaskStatus, type WorkTaskPriority } from "@/lib/task-utils"

const schema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional().nullable(),
  status: z.enum(["BACKLOG","TODO","IN_PROGRESS","IN_REVIEW","DONE","CANCELLED"]),
  priority: z.enum(["CRITICAL","HIGH","MEDIUM","LOW","NONE"]),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  labelIds: z.array(z.string()).default([]),
})
type FormData = z.infer<typeof schema>

interface TaskDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultStatus?: string
  task?: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: Date | null
    projectId: string | null
    departmentId: string | null
    assignments: { user: { id: string } }[]
    labels: { label: { id: string } }[]
  } | null
  departments: { id: string; name: string }[]
  labels: { id: string; name: string; color: string }[]
  projects: { id: string; name: string }[]
  companyUsers: { id: string; name: string | null; email: string; avatarUrl: string | null }[]
  onCreated?: (task: unknown) => void
  onUpdated?: (task: unknown) => void
}

export function TaskDialog({
  open, onOpenChange, defaultStatus = "TODO", task,
  departments, labels, projects, companyUsers, onCreated, onUpdated,
}: TaskDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = !!task

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: (task?.status ?? defaultStatus) as WorkTaskStatus,
      priority: (task?.priority ?? "NONE") as WorkTaskPriority,
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      projectId: task?.projectId ?? "",
      departmentId: task?.departmentId ?? "",
      assigneeIds: task?.assignments.map(a => a.user.id) ?? [],
      labelIds: task?.labels.map(l => l.label.id) ?? [],
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const payload = {
      ...data,
      projectId: data.projectId || null,
      departmentId: data.departmentId || null,
      dueDate: data.dueDate || null,
    }
    if (isEdit && task) {
      const res = await updateWorkTask(task.id, payload)
      setLoading(false)
      if (res.success) {
        toast({ title: "Tarefa atualizada" })
        onUpdated?.(res.data)
        onOpenChange(false)
      } else {
        toast({ variant: "destructive", title: "Erro", description: res.error })
      }
    } else {
      const res = await createWorkTask(payload)
      setLoading(false)
      if (res.success) {
        toast({ title: "Tarefa criada" })
        onCreated?.(res.data)
        onOpenChange(false)
        form.reset()
      } else {
        toast({ variant: "destructive", title: "Erro", description: res.error })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl><Input {...field} placeholder="Título da tarefa" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} rows={3} placeholder="Descrição opcional..." />
                </FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as WorkTaskStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABELS) as WorkTaskPriority[]).map(p => (
                        <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Projeto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            {departments.length > 0 && (
              <FormField control={form.control} name="departmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="assigneeIds" render={({ field }) => (
              <FormItem>
                <FormLabel>Responsáveis</FormLabel>
                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto border rounded-md p-2">
                  {companyUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-muted">
                      <Checkbox
                        checked={field.value.includes(u.id)}
                        onCheckedChange={checked => {
                          if (checked) field.onChange([...field.value, u.id])
                          else field.onChange(field.value.filter((id: string) => id !== u.id))
                        }}
                      />
                      <span className="truncate">{u.name}</span>
                    </label>
                  ))}
                </div>
              </FormItem>
            )} />
            {labels.length > 0 && (
              <FormField control={form.control} name="labelIds" render={({ field }) => (
                <FormItem>
                  <FormLabel>Etiquetas</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {labels.map(l => {
                      const selected = field.value.includes(l.id)
                      return (
                        <button
                          key={l.id} type="button"
                          onClick={() => {
                            if (selected) field.onChange(field.value.filter((id: string) => id !== l.id))
                            else field.onChange([...field.value, l.id])
                          }}
                          className="text-xs px-2 py-1 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: l.color + "33",
                            borderColor: selected ? l.color : "transparent",
                            color: l.color,
                            opacity: selected ? 1 : 0.5,
                          }}
                        >
                          {l.name}
                        </button>
                      )
                    })}
                  </div>
                </FormItem>
              )} />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar Tarefa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

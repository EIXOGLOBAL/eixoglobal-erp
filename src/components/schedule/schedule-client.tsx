'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
    createTask,
    updateTask,
    deleteTask,
    updateTaskProgress,
} from "@/app/actions/schedule-actions"
import { Plus, Pencil, Trash2, BarChart2, List } from "lucide-react"
import { HolidayDatePicker } from "@/components/ui/holiday-date-picker"
import { formatDate } from "@/lib/formatters"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED" | "BLOCKED" | "WAITING_APPROVAL"
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

type Task = {
    id: string
    name: string
    description: string | null
    phase: string | null
    startDate: Date
    endDate: Date
    plannedStart: Date | null
    plannedEnd: Date | null
    percentDone: number
    status: TaskStatus
    priority: TaskPriority
    projectId: string
    parentId: string | null
    project: { id: string; name: string }
    children: { id: string }[]
}

type Project = {
    id: string
    name: string
    status: string
    startDate: Date
    endDate: Date | null
}

interface ScheduleClientProps {
    tasks: Task[]
    projects: Project[]
}

// ---------------------------------------------------------------------------
// Labels & colors
// ---------------------------------------------------------------------------

const statusLabels: Record<TaskStatus, string> = {
    TODO: "A Fazer",
    IN_PROGRESS: "Em Andamento",
    COMPLETED: "Concluido",
    ON_HOLD: "Em Espera",
    CANCELLED: "Cancelado",
    BLOCKED: "Bloqueado",
    WAITING_APPROVAL: "Aguardando Aprovação",
}

const priorityLabels: Record<TaskPriority, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    CRITICAL: "Critica",
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
    const styles: Record<TaskPriority, string> = {
        LOW: "bg-gray-100 text-gray-700 border-gray-200",
        MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
        HIGH: "bg-orange-100 text-orange-700 border-orange-200",
        CRITICAL: "bg-red-100 text-red-700 border-red-200",
    }
    return (
        <Badge variant="outline" className={styles[priority]}>
            {priorityLabels[priority]}
        </Badge>
    )
}

function StatusBadge({ status }: { status: TaskStatus }) {
    if (status === "TODO") {
        return <Badge variant="outline">{statusLabels[status]}</Badge>
    }
    if (status === "IN_PROGRESS") {
        return <Badge variant="default">{statusLabels[status]}</Badge>
    }
    if (status === "COMPLETED") {
        return (
            <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                {statusLabels[status]}
            </Badge>
        )
    }
    if (status === "ON_HOLD") {
        return <Badge variant="outline">{statusLabels[status]}</Badge>
    }
    // CANCELLED
    return <Badge variant="destructive">{statusLabels[status]}</Badge>
}

// ---------------------------------------------------------------------------
// Zod schema for the form (client-side)
// ---------------------------------------------------------------------------

const taskFormSchema = z.object({
    name: z.string().min(2, "Nome e obrigatorio (minimo 2 caracteres)"),
    description: z.string().optional(),
    phase: z.string().optional(),
    projectId: z.string().min(1, "Projeto e obrigatorio"),
    status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED", "BLOCKED", "WAITING_APPROVAL"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    startDate: z.string().min(1, "Data de inicio e obrigatoria"),
    endDate: z.string().min(1, "Data de fim e obrigatoria"),
    plannedStart: z.string().optional(),
    plannedEnd: z.string().optional(),
    percentDone: z.coerce.number().min(0).max(100).default(0),
    parentId: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

const progressFormSchema = z.object({
    percentDone: z.coerce.number().min(0, "Minimo 0").max(100, "Maximo 100"),
})

type ProgressFormValues = z.infer<typeof progressFormSchema>

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScheduleClient({ tasks, projects }: ScheduleClientProps) {
    const { toast } = useToast()

    // Dialog states
    const [taskDialogOpen, setTaskDialogOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [progressDialogOpen, setProgressDialogOpen] = useState(false)
    const [progressTask, setProgressTask] = useState<Task | null>(null)
    const [loading, setLoading] = useState(false)

    // Filter states
    const [filterProject, setFilterProject] = useState<string>("ALL")
    const [filterStatus, setFilterStatus] = useState<string>("ALL")
    const [filterPriority, setFilterPriority] = useState<string>("ALL")

    // Task form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskForm = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            phase: "",
            projectId: projects[0]?.id ?? "",
            status: "TODO",
            priority: "MEDIUM",
            startDate: "",
            endDate: "",
            plannedStart: "",
            plannedEnd: "",
            percentDone: 0,
            parentId: "",
        },
    })

    // Progress form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const progressForm = useForm<ProgressFormValues>({
        resolver: zodResolver(progressFormSchema) as any,
        defaultValues: { percentDone: 0 },
    })

    // -----------------------------------------------------------------------
    // Filtered tasks
    // -----------------------------------------------------------------------

    const filteredTasks = tasks.filter((t) => {
        if (filterProject !== "ALL" && t.projectId !== filterProject) return false
        if (filterStatus !== "ALL" && t.status !== filterStatus) return false
        if (filterPriority !== "ALL" && t.priority !== filterPriority) return false
        return true
    })

    // -----------------------------------------------------------------------
    // Dialog helpers
    // -----------------------------------------------------------------------

    function openCreate() {
        setEditingTask(null)
        taskForm.reset({
            name: "",
            description: "",
            phase: "",
            projectId: projects[0]?.id ?? "",
            status: "TODO",
            priority: "MEDIUM",
            startDate: "",
            endDate: "",
            plannedStart: "",
            plannedEnd: "",
            percentDone: 0,
            parentId: "",
        })
        setTaskDialogOpen(true)
    }

    function openEdit(task: Task) {
        setEditingTask(task)
        taskForm.reset({
            name: task.name,
            description: task.description ?? "",
            phase: task.phase ?? "",
            projectId: task.projectId,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate
                ? new Date(task.startDate).toISOString().slice(0, 10)
                : "",
            endDate: task.endDate
                ? new Date(task.endDate).toISOString().slice(0, 10)
                : "",
            plannedStart: task.plannedStart
                ? new Date(task.plannedStart).toISOString().slice(0, 10)
                : "",
            plannedEnd: task.plannedEnd
                ? new Date(task.plannedEnd).toISOString().slice(0, 10)
                : "",
            percentDone: task.percentDone,
            parentId: task.parentId ?? "",
        })
        setTaskDialogOpen(true)
    }

    function openProgress(task: Task) {
        setProgressTask(task)
        progressForm.reset({ percentDone: task.percentDone })
        setProgressDialogOpen(true)
    }

    // -----------------------------------------------------------------------
    // Submit handlers
    // -----------------------------------------------------------------------

    async function onTaskSubmit(values: TaskFormValues) {
        setLoading(true)
        try {
            const payload = {
                name: values.name,
                description: values.description || null,
                phase: values.phase || null,
                projectId: values.projectId,
                status: values.status as TaskStatus,
                priority: values.priority as TaskPriority,
                startDate: values.startDate,
                endDate: values.endDate,
                plannedStart: values.plannedStart || null,
                plannedEnd: values.plannedEnd || null,
                percentDone: values.percentDone,
                parentId: values.parentId || null,
            }

            let result
            if (editingTask) {
                result = await updateTask(editingTask.id, payload)
            } else {
                result = await createTask(payload)
            }

            if (result.success) {
                toast({
                    title: editingTask
                        ? "Tarefa atualizada com sucesso!"
                        : "Tarefa criada com sucesso!",
                })
                setTaskDialogOpen(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    async function onProgressSubmit(values: ProgressFormValues) {
        if (!progressTask) return
        setLoading(true)
        try {
            const result = await updateTaskProgress(progressTask.id, values.percentDone)
            if (result.success) {
                toast({ title: "Progresso atualizado com sucesso!" })
                setProgressDialogOpen(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(task: Task) {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir a tarefa "${task.name}"? Esta acao nao pode ser desfeita.`
        )
        if (!confirmed) return

        const result = await deleteTask(task.id)
        if (result.success) {
            toast({ title: "Tarefa excluida com sucesso!" })
        } else {
            toast({
                variant: "destructive",
                title: "Erro ao excluir",
                description: result.error,
            })
        }
    }

    // -----------------------------------------------------------------------
    // Tasks grouped by project (for "Por Projeto" tab)
    // -----------------------------------------------------------------------

    const tasksByProject = projects
        .map((project) => ({
            project,
            tasks: filteredTasks.filter((t) => t.projectId === project.id),
        }))
        .filter((g) => g.tasks.length > 0)

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">Tarefas</h3>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Tarefa
                </Button>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-3">
                {/* Project filter */}
                <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Filtrar por projeto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os Projetos</SelectItem>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Status filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os Status</SelectItem>
                        <SelectItem value="TODO">A Fazer</SelectItem>
                        <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                        <SelectItem value="COMPLETED">Concluido</SelectItem>
                        <SelectItem value="ON_HOLD">Em Espera</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                </Select>

                {/* Priority filter */}
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas as Prioridades</SelectItem>
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="MEDIUM">Media</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="CRITICAL">Critica</SelectItem>
                    </SelectContent>
                </Select>

                {(filterProject !== "ALL" ||
                    filterStatus !== "ALL" ||
                    filterPriority !== "ALL") && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setFilterProject("ALL")
                            setFilterStatus("ALL")
                            setFilterPriority("ALL")
                        }}
                    >
                        Limpar filtros
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="lista">
                <TabsList>
                    <TabsTrigger value="lista" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Lista
                    </TabsTrigger>
                    <TabsTrigger value="por-projeto" className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4" />
                        Por Projeto
                    </TabsTrigger>
                </TabsList>

                {/* ----------------------------------------------------------------- */}
                {/* Tab 1: Lista                                                       */}
                {/* ----------------------------------------------------------------- */}
                <TabsContent value="lista">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarefa</TableHead>
                                    <TableHead>Fase/Etapa</TableHead>
                                    <TableHead>Projeto</TableHead>
                                    <TableHead>Prioridade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Inicio Planejado</TableHead>
                                    <TableHead>Fim Planejado</TableHead>
                                    <TableHead className="w-[120px]">Progresso</TableHead>
                                    <TableHead className="text-center">Acoes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={9}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            {tasks.length === 0
                                                ? 'Nenhuma tarefa cadastrada. Clique em "Nova Tarefa" para comecar.'
                                                : "Nenhuma tarefa encontrada para os filtros selecionados."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTasks.map((task) => (
                                        <TableRow key={task.id}>
                                            {/* Tarefa */}
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{task.name}</p>
                                                    {task.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Fase */}
                                            <TableCell className="text-sm text-muted-foreground">
                                                {task.phase ?? "—"}
                                            </TableCell>

                                            {/* Projeto */}
                                            <TableCell className="text-sm">
                                                {task.project.name}
                                            </TableCell>

                                            {/* Prioridade */}
                                            <TableCell>
                                                <PriorityBadge priority={task.priority} />
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <StatusBadge status={task.status} />
                                            </TableCell>

                                            {/* Inicio Planejado */}
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(task.plannedStart)}
                                            </TableCell>

                                            {/* Fim Planejado */}
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(task.plannedEnd)}
                                            </TableCell>

                                            {/* Progresso */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={task.percentDone}
                                                        className="h-2"
                                                    />
                                                    <p className="text-xs text-muted-foreground text-right">
                                                        {task.percentDone}%
                                                    </p>
                                                </div>
                                            </TableCell>

                                            {/* Acoes */}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="Editar tarefa"
                                                        onClick={() => openEdit(task)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">Editar</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                                        title="Atualizar progresso"
                                                        onClick={() => openProgress(task)}
                                                    >
                                                        <BarChart2 className="h-4 w-4" />
                                                        <span className="sr-only">Progresso</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                        title="Excluir tarefa"
                                                        onClick={() => handleDelete(task)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Excluir</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* ----------------------------------------------------------------- */}
                {/* Tab 2: Por Projeto                                                 */}
                {/* ----------------------------------------------------------------- */}
                <TabsContent value="por-projeto">
                    {tasksByProject.length === 0 ? (
                        <div className="rounded-md border p-8 text-center text-muted-foreground">
                            Nenhuma tarefa encontrada para os filtros selecionados.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {tasksByProject.map(({ project, tasks: projectTasks }) => {
                                const avg =
                                    projectTasks.length > 0
                                        ? projectTasks.reduce(
                                              (acc, t) => acc + t.percentDone,
                                              0
                                          ) / projectTasks.length
                                        : 0

                                return (
                                    <div key={project.id} className="rounded-md border">
                                        {/* Project header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
                                            <div>
                                                <h4 className="font-semibold text-base">
                                                    {project.name}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {projectTasks.length} tarefa(s)
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 min-w-[160px]">
                                                <Progress
                                                    value={avg}
                                                    className="h-2 flex-1"
                                                />
                                                <span className="text-sm font-medium w-10 text-right">
                                                    {Math.round(avg)}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Project tasks mini-table */}
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tarefa</TableHead>
                                                    <TableHead>Fase/Etapa</TableHead>
                                                    <TableHead>Prioridade</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Inicio Planejado</TableHead>
                                                    <TableHead>Fim Planejado</TableHead>
                                                    <TableHead className="w-[120px]">
                                                        Progresso
                                                    </TableHead>
                                                    <TableHead className="text-center">
                                                        Acoes
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {projectTasks.map((task) => (
                                                    <TableRow key={task.id}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">
                                                                    {task.name}
                                                                </p>
                                                                {task.description && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                                        {task.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {task.phase ?? "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <PriorityBadge
                                                                priority={task.priority}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={task.status} />
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatDate(task.plannedStart)}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatDate(task.plannedEnd)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <Progress
                                                                    value={task.percentDone}
                                                                    className="h-2"
                                                                />
                                                                <p className="text-xs text-muted-foreground text-right">
                                                                    {task.percentDone}%
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    title="Editar tarefa"
                                                                    onClick={() => openEdit(task)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                    <span className="sr-only">
                                                                        Editar
                                                                    </span>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                                                    title="Atualizar progresso"
                                                                    onClick={() =>
                                                                        openProgress(task)
                                                                    }
                                                                >
                                                                    <BarChart2 className="h-4 w-4" />
                                                                    <span className="sr-only">
                                                                        Progresso
                                                                    </span>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                    title="Excluir tarefa"
                                                                    onClick={() =>
                                                                        handleDelete(task)
                                                                    }
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span className="sr-only">
                                                                        Excluir
                                                                    </span>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ================================================================= */}
            {/* Dialog: Create / Edit Task                                         */}
            {/* ================================================================= */}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
                        </DialogTitle>
                    </DialogHeader>

                    <Form {...taskForm}>
                        <form
                            onSubmit={taskForm.handleSubmit(onTaskSubmit)}
                            className="space-y-4"
                        >
                            {/* Name */}
                            <FormField
                                control={taskForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome da Tarefa *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ex: Fundacao - Escavacao"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Phase */}
                            <FormField
                                control={taskForm.control}
                                name="phase"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fase/Etapa (WBS)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ex: 1.2 - Estrutura"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Project */}
                            <FormField
                                control={taskForm.control}
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projeto *</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o projeto" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {projects.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Priority + Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={taskForm.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prioridade *</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Prioridade" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="LOW">Baixa</SelectItem>
                                                    <SelectItem value="MEDIUM">Media</SelectItem>
                                                    <SelectItem value="HIGH">Alta</SelectItem>
                                                    <SelectItem value="CRITICAL">Critica</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={taskForm.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status *</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="TODO">A Fazer</SelectItem>
                                                    <SelectItem value="IN_PROGRESS">
                                                        Em Andamento
                                                    </SelectItem>
                                                    <SelectItem value="COMPLETED">
                                                        Concluido
                                                    </SelectItem>
                                                    <SelectItem value="ON_HOLD">Em Espera</SelectItem>
                                                    <SelectItem value="CANCELLED">
                                                        Cancelado
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Start + End dates (actual) */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={taskForm.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Inicio *</FormLabel>
                                            <FormControl>
                                                <HolidayDatePicker
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    disabled={field.disabled}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={taskForm.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Fim *</FormLabel>
                                            <FormControl>
                                                <HolidayDatePicker
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    disabled={field.disabled}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Planned start + end */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={taskForm.control}
                                    name="plannedStart"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Inicio Planejado</FormLabel>
                                            <FormControl>
                                                <HolidayDatePicker
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    disabled={field.disabled}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={taskForm.control}
                                    name="plannedEnd"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fim Planejado</FormLabel>
                                            <FormControl>
                                                <HolidayDatePicker
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    disabled={field.disabled}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Percent done */}
                            <FormField
                                control={taskForm.control}
                                name="percentDone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Progresso (%) </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(Number(e.target.value))
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={taskForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descricao</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descricao detalhada da tarefa..."
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setTaskDialogOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading
                                        ? "Salvando..."
                                        : editingTask
                                        ? "Salvar Alteracoes"
                                        : "Criar Tarefa"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* ================================================================= */}
            {/* Dialog: Update Progress                                            */}
            {/* ================================================================= */}
            <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Atualizar Progresso</DialogTitle>
                    </DialogHeader>

                    {progressTask && (
                        <div className="mb-2">
                            <p className="text-sm font-medium">{progressTask.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {progressTask.project.name}
                            </p>
                        </div>
                    )}

                    <Form {...progressForm}>
                        <form
                            onSubmit={progressForm.handleSubmit(onProgressSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={progressForm.control}
                                name="percentDone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Percentual Concluido (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(Number(e.target.value))
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        <p className="text-xs text-muted-foreground">
                                            0 = A Fazer, 1–99 = Em Andamento, 100 = Concluido
                                        </p>
                                    </FormItem>
                                )}
                            />

                            {/* Live progress preview */}
                            <div className="space-y-1">
                                <Progress
                                    value={progressForm.watch("percentDone") ?? 0}
                                    className="h-3"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {progressForm.watch("percentDone") ?? 0}%
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setProgressDialogOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Salvando..." : "Atualizar"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

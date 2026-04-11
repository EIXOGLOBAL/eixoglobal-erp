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
    DialogTrigger,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
    createTraining,
    updateTraining,
    deleteTraining,
    addParticipant,
    removeParticipant,
    markAttendance,
    getTrainingParticipants,
} from "@/app/actions/training-actions"
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    GraduationCap,
    Search,
    Users,
    UserPlus,
    UserMinus,
} from "lucide-react"
import { formatDate } from "@/lib/formatters"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"
import { formatCurrency as fmtCurrencyExport, formatDate as fmtDateExport } from "@/lib/export-utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type TrainingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TrainingType = 'INTERNAL' | 'EXTERNAL' | 'NR' | 'CERTIFICATION' | 'OTHER'

type Training = {
    id: string
    title: string
    description: string | null
    instructor: string | null
    location: string | null
    startDate: string
    endDate: string | null
    hours: number
    maxParticipants: number | null
    status: TrainingStatus
    type: TrainingType
    cost: number | null
    companyId: string
    createdAt: string
    updatedAt: string
    _count: { participants: number }
}

type Employee = {
    id: string
    name: string
    jobTitle: string
}

type Participant = {
    id: string
    trainingId: string
    employeeId: string
    attended: boolean
    certified: boolean
    notes: string | null
    employee: {
        id: string
        name: string
        jobTitle: string
    }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const statusLabels: Record<TrainingStatus, string> = {
    SCHEDULED: 'Agendado',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
}

const typeLabels: Record<TrainingType, string> = {
    INTERNAL: 'Interno',
    EXTERNAL: 'Externo',
    NR: 'NR',
    CERTIFICATION: 'Certificação',
    OTHER: 'Outro',
}

function StatusBadge({ status }: { status: TrainingStatus }) {
    switch (status) {
        case 'SCHEDULED':
            return (
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                    {statusLabels[status]}
                </Badge>
            )
        case 'IN_PROGRESS':
            return (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200" variant="outline">
                    {statusLabels[status]}
                </Badge>
            )
        case 'COMPLETED':
            return (
                <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                    {statusLabels[status]}
                </Badge>
            )
        case 'CANCELLED':
            return <Badge variant="destructive">{statusLabels[status]}</Badge>
    }
}

// ─── Form Schema ─────────────────────────────────────────────────────────────

const trainingFormSchema = z.object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
    type: z.enum(['INTERNAL', 'EXTERNAL', 'NR', 'CERTIFICATION', 'OTHER']),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    instructor: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().optional(),
    hours: z.coerce.number().min(0, "Carga horária não pode ser negativa").default(0),
    maxParticipants: z.coerce.number().int().positive().optional(),
    cost: z.coerce.number().min(0).optional(),
    description: z.string().optional(),
})

type FormValues = z.infer<typeof trainingFormSchema>

// ─── Export columns ──────────────────────────────────────────────────────────

const trainingExportColumns: ExportColumn[] = [
    { key: 'title', label: 'Título' },
    { key: 'type', label: 'Tipo', format: (v) => typeLabels[v as TrainingType] || String(v) },
    { key: 'status', label: 'Status', format: (v) => statusLabels[v as TrainingStatus] || String(v) },
    { key: 'instructor', label: 'Instrutor', format: (v) => v ? String(v) : '' },
    { key: 'location', label: 'Local', format: (v) => v ? String(v) : '' },
    { key: 'startDate', label: 'Data Início', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: 'endDate', label: 'Data Término', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: 'hours', label: 'Carga Horária (h)' },
    { key: '_participants', label: 'Participantes' },
    { key: 'cost', label: 'Custo', format: (v) => v != null ? fmtCurrencyExport(v as number) : '' },
]

function mapTrainingsForExport(list: Training[]): Record<string, unknown>[] {
    return list.map(t => ({
        ...t,
        _participants: `${t._count.participants}${t.maxParticipants ? ` / ${t.maxParticipants}` : ''}`,
    }))
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrainingsClientProps {
    companyId: string
    trainings: Training[]
    employees: Employee[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrainingsClient({ companyId, trainings, employees }: TrainingsClientProps) {
    const [open, setOpen] = useState(false)
    const [editingTraining, setEditingTraining] = useState<Training | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<TrainingStatus | 'ALL'>('ALL')
    const [loading, setLoading] = useState(false)

    // Participants dialog state
    const [participantsOpen, setParticipantsOpen] = useState(false)
    const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [participantsLoading, setParticipantsLoading] = useState(false)

    // Add participant sub-dialog state
    const [addParticipantOpen, setAddParticipantOpen] = useState(false)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
    const [addingParticipant, setAddingParticipant] = useState(false)

    const { toast } = useToast()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<FormValues>({
        resolver: zodResolver(trainingFormSchema) as any,
        defaultValues: {
            title: '',
            type: 'INTERNAL',
            status: 'SCHEDULED',
            instructor: '',
            location: '',
            startDate: '',
            endDate: '',
            hours: 0,
            maxParticipants: undefined,
            cost: undefined,
            description: '',
        },
    })

    // ── CRUD helpers ──────────────────────────────────────────────────────────

    function openCreate() {
        setEditingTraining(null)
        form.reset({
            title: '',
            type: 'INTERNAL',
            status: 'SCHEDULED',
            instructor: '',
            location: '',
            startDate: '',
            endDate: '',
            hours: 0,
            maxParticipants: undefined,
            cost: undefined,
            description: '',
        })
        setOpen(true)
    }

    function openEdit(training: Training) {
        setEditingTraining(training)
        form.reset({
            title: training.title,
            type: training.type,
            status: training.status,
            instructor: training.instructor ?? '',
            location: training.location ?? '',
            startDate: training.startDate.slice(0, 10),
            endDate: training.endDate ? training.endDate.slice(0, 10) : '',
            hours: training.hours,
            maxParticipants: training.maxParticipants ?? undefined,
            cost: training.cost ?? undefined,
            description: training.description ?? '',
        })
        setOpen(true)
    }

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const payload = {
                title: values.title,
                description: values.description || null,
                instructor: values.instructor || null,
                location: values.location || null,
                startDate: values.startDate,
                endDate: values.endDate || null,
                hours: values.hours,
                maxParticipants: values.maxParticipants ?? null,
                status: values.status,
                type: values.type,
                cost: values.cost ?? null,
                companyId,
            }

            if (editingTraining) {
                const result = await updateTraining(editingTraining.id, payload)
                if (result.success) {
                    toast({ title: "Treinamento atualizado com sucesso!" })
                    setOpen(false)
                } else {
                    toast({ variant: "destructive", title: "Erro", description: result.error })
                }
            } else {
                const result = await createTraining(payload)
                if (result.success) {
                    toast({ title: "Treinamento criado com sucesso!" })
                    setOpen(false)
                    form.reset()
                } else {
                    toast({ variant: "destructive", title: "Erro", description: result.error })
                }
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(training: Training) {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir o treinamento "${training.title}"? Esta ação não pode ser desfeita.`
        )
        if (!confirmed) return

        const result = await deleteTraining(training.id)
        if (result.success) {
            toast({ title: "Treinamento excluído com sucesso!" })
        } else {
            toast({ variant: "destructive", title: "Erro ao excluir", description: result.error })
        }
    }

    // ── Participants helpers ───────────────────────────────────────────────────

    async function openParticipants(training: Training) {
        setSelectedTraining(training)
        setParticipantsLoading(true)
        setParticipantsOpen(true)

        const result = await getTrainingParticipants(training.id)
        if (result.success) {
            setParticipants(result.data as Participant[])
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
        setParticipantsLoading(false)
    }

    async function handleAddParticipant() {
        if (!selectedTraining || !selectedEmployeeId) return
        setAddingParticipant(true)

        const result = await addParticipant(selectedTraining.id, selectedEmployeeId)
        if (result.success) {
            toast({ title: "Participante adicionado com sucesso!" })
            setAddParticipantOpen(false)
            setSelectedEmployeeId('')
            // Refresh participants list
            const refreshed = await getTrainingParticipants(selectedTraining.id)
            if (refreshed.success) setParticipants(refreshed.data as Participant[])
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
        setAddingParticipant(false)
    }

    async function handleRemoveParticipant(employeeId: string) {
        if (!selectedTraining) return

        const result = await removeParticipant(selectedTraining.id, employeeId)
        if (result.success) {
            toast({ title: "Participante removido com sucesso!" })
            setParticipants(prev => prev.filter(p => p.employeeId !== employeeId))
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    async function handleMarkAttendance(
        employeeId: string,
        attended: boolean,
        certified: boolean
    ) {
        if (!selectedTraining) return

        const result = await markAttendance(selectedTraining.id, employeeId, attended, certified)
        if (result.success) {
            setParticipants(prev =>
                prev.map(p =>
                    p.employeeId === employeeId ? { ...p, attended, certified } : p
                )
            )
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    // ── Filtering ─────────────────────────────────────────────────────────────

    const filteredTrainings = trainings.filter(t => {
        const q = search.toLowerCase()
        const matchesSearch =
            t.title.toLowerCase().includes(q) ||
            (t.instructor ?? '').toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
        return matchesSearch && matchesStatus
    })

    // Enrolled employee IDs for the current training (to prevent duplicates)
    const enrolledIds = new Set(participants.map(p => p.employeeId))
    const availableEmployees = employees.filter(e => !enrolledIds.has(e.id))

    const formatCurrency = (value: number | null) => {
        if (value == null) return '—'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por título ou instrutor..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Status filter */}
                    <Select
                        value={statusFilter}
                        onValueChange={v => setStatusFilter(v as TrainingStatus | 'ALL')}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os status</SelectItem>
                            <SelectItem value="SCHEDULED">Agendado</SelectItem>
                            <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                            <SelectItem value="COMPLETED">Concluído</SelectItem>
                            <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Export + New training buttons */}
                <div className="flex items-center gap-2">
                    <ExportButton
                        data={mapTrainingsForExport(filteredTrainings)}
                        columns={trainingExportColumns}
                        filename="treinamentos"
                        title="Lista de Treinamentos"
                        sheetName="Treinamentos"
                        size="sm"
                    />
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Treinamento
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5" />
                                {editingTraining ? 'Editar Treinamento' : 'Novo Treinamento'}
                            </DialogTitle>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {/* Title */}
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Título *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do treinamento" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Type + Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo *</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o tipo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="INTERNAL">Interno</SelectItem>
                                                        <SelectItem value="EXTERNAL">Externo</SelectItem>
                                                        <SelectItem value="NR">Norma Regulamentadora</SelectItem>
                                                        <SelectItem value="CERTIFICATION">Certificação</SelectItem>
                                                        <SelectItem value="OTHER">Outro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
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
                                                            <SelectValue placeholder="Selecione o status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="SCHEDULED">Agendado</SelectItem>
                                                        <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                                                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                                                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Instructor + Location */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="instructor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Instrutor</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nome do instrutor" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Local</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Local do treinamento" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Start Date + End Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data de Início *</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data de Término</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Hours + MaxParticipants + Cost */}
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="hours"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Carga Horária (h) *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        placeholder="0"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="maxParticipants"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Vagas</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Ilimitado"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cost"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Custo (R$)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0,00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Descreva o treinamento, objetivos, conteúdo programático..."
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
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading
                                            ? 'Salvando...'
                                            : editingTraining
                                            ? 'Salvar Alterações'
                                            : 'Criar Treinamento'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            {/* Trainings Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Instrutor</TableHead>
                            <TableHead>Data Início</TableHead>
                            <TableHead className="text-center">Carga Horária</TableHead>
                            <TableHead className="text-center">Participantes</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTrainings.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {search || statusFilter !== 'ALL'
                                        ? 'Nenhum treinamento encontrado para o filtro aplicado.'
                                        : 'Nenhum treinamento cadastrado. Clique em "Novo Treinamento" para começar.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTrainings.map(training => (
                                <TableRow key={training.id}>
                                    {/* Título */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div>
                                                <p className="font-medium">{training.title}</p>
                                                {training.location && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {training.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Tipo */}
                                    <TableCell>
                                        <span className="text-sm">{typeLabels[training.type]}</span>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <StatusBadge status={training.status} />
                                    </TableCell>

                                    {/* Instrutor */}
                                    <TableCell className="text-sm text-muted-foreground">
                                        {training.instructor ?? '—'}
                                    </TableCell>

                                    {/* Data Início */}
                                    <TableCell className="text-sm">
                                        {formatDate(training.startDate)}
                                    </TableCell>

                                    {/* Carga Horária */}
                                    <TableCell className="text-center text-sm">
                                        {training.hours}h
                                    </TableCell>

                                    {/* Participantes */}
                                    <TableCell className="text-center">
                                        <span className="text-sm font-medium">
                                            {training._count.participants}
                                            {training.maxParticipants
                                                ? ` / ${training.maxParticipants}`
                                                : ''}
                                        </span>
                                    </TableCell>

                                    {/* Custo */}
                                    <TableCell className="text-right text-sm">
                                        {formatCurrency(training.cost)}
                                    </TableCell>

                                    {/* Ações */}
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <span className="sr-only">Abrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEdit(training)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => openParticipants(training)}
                                                >
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Ver Participantes
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(training)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Deletar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Participants Dialog */}
            <Dialog open={participantsOpen} onOpenChange={setParticipantsOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Participantes — {selectedTraining?.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Add participant button */}
                        <div className="flex justify-end">
                            <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={availableEmployees.length === 0}
                                    >
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Adicionar Participante
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm">
                                    <DialogHeader>
                                        <DialogTitle>Adicionar Participante</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Funcionário</label>
                                            <Select
                                                value={selectedEmployeeId}
                                                onValueChange={setSelectedEmployeeId}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o funcionário" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableEmployees.map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id}>
                                                            {emp.name} — {emp.jobTitle}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setAddParticipantOpen(false)
                                                    setSelectedEmployeeId('')
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={!selectedEmployeeId || addingParticipant}
                                                onClick={handleAddParticipant}
                                            >
                                                {addingParticipant ? 'Adicionando...' : 'Adicionar'}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Participants list */}
                        {participantsLoading ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Carregando participantes...
                            </div>
                        ) : participants.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Nenhum participante inscrito. Clique em "Adicionar Participante" para inscrever funcionários.
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Funcionário</TableHead>
                                            <TableHead className="text-center">Presente</TableHead>
                                            <TableHead className="text-center">Certificado</TableHead>
                                            <TableHead className="text-center">Remover</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {participants.map(participant => (
                                            <TableRow key={participant.id}>
                                                {/* Employee info */}
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {participant.employee.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {participant.employee.jobTitle}
                                                        </p>
                                                    </div>
                                                </TableCell>

                                                {/* Attended checkbox */}
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={participant.attended}
                                                        onCheckedChange={checked => {
                                                            handleMarkAttendance(
                                                                participant.employeeId,
                                                                checked === true,
                                                                participant.certified
                                                            )
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* Certified checkbox */}
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={participant.certified}
                                                        onCheckedChange={checked => {
                                                            handleMarkAttendance(
                                                                participant.employeeId,
                                                                participant.attended,
                                                                checked === true
                                                            )
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* Remove */}
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() =>
                                                            handleRemoveParticipant(participant.employeeId)
                                                        }
                                                    >
                                                        <UserMinus className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

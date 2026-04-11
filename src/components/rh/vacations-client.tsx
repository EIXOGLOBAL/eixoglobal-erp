'use client'

import { useState, useEffect } from "react"
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
import { useToast } from "@/hooks/use-toast"
import {
    createVacationRequest,
    updateVacationRequest,
    deleteVacationRequest,
    approveVacationRequest,
    rejectVacationRequest,
} from "@/app/actions/vacation-actions"
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    Search,
    CalendarDays,
} from "lucide-react"

import { formatDate } from "@/lib/formatters"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"
import { formatDate as fmtDateExport } from "@/lib/export-utils"
// ---- Types ----

type LeaveType = 'VACATION' | 'SICK_LEAVE' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'PERSONAL' | 'ACCIDENT' | 'OTHER'
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

type Employee = {
    id: string
    name: string
    jobTitle: string | null
}

type VacationRequest = {
    id: string
    employeeId: string
    employee: Employee
    type: LeaveType
    startDate: Date
    endDate: Date
    days: number
    status: LeaveStatus
    reason: string | null
    approvedBy: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
}

// ---- Labels ----

const typeLabels: Record<LeaveType, string> = {
    VACATION: 'Férias',
    SICK_LEAVE: 'Licença Médica',
    MATERNITY: 'Lic. Maternidade',
    PATERNITY: 'Lic. Paternidade',
    BEREAVEMENT: 'Luto',
    PERSONAL: 'Pessoal',
    ACCIDENT: 'Acidente de Trabalho',
    OTHER: 'Outro',
}

const statusLabels: Record<LeaveStatus, string> = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    CANCELLED: 'Cancelado',
}

function StatusBadge({ status }: { status: LeaveStatus }) {
    if (status === 'PENDING') {
        return (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200" variant="outline">
                {statusLabels.PENDING}
            </Badge>
        )
    }
    if (status === 'APPROVED') {
        return (
            <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                {statusLabels.APPROVED}
            </Badge>
        )
    }
    if (status === 'REJECTED') {
        return (
            <Badge variant="destructive">
                {statusLabels.REJECTED}
            </Badge>
        )
    }
    return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200" variant="outline">
            {statusLabels[status]}
        </Badge>
    )
}

// ---- Form Schema ----

const formSchema = z.object({
    employeeId: z.string().uuid("Selecione um funcionário"),
    type: z.enum(['VACATION', 'SICK_LEAVE', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'PERSONAL', 'ACCIDENT', 'OTHER']),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().min(1, "Data de fim é obrigatória"),
    reason: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const approveSchema = z.object({
    approvedBy: z.string().min(1, "Nome do aprovador é obrigatório"),
})

type ApproveValues = z.infer<typeof approveSchema>

const rejectSchema = z.object({
    reason: z.string().min(1, "Motivo é obrigatório"),
})

type RejectValues = z.infer<typeof rejectSchema>

// ---- Helper ----

function calculateDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime()
    if (diff < 0) return 0
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
}

// ---- Export columns ----

const vacationExportColumns: ExportColumn[] = [
    { key: '_employeeName', label: 'Funcionário' },
    { key: '_employeeJobTitle', label: 'Cargo' },
    { key: 'type', label: 'Tipo', format: (v) => typeLabels[v as LeaveType] || String(v) },
    { key: 'status', label: 'Status', format: (v) => statusLabels[v as LeaveStatus] || String(v) },
    { key: 'startDate', label: 'Início', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: 'endDate', label: 'Fim', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: 'days', label: 'Dias' },
    { key: 'approvedBy', label: 'Aprovado por', format: (v) => v ? String(v) : '' },
    { key: 'reason', label: 'Motivo', format: (v) => v ? String(v) : '' },
]

function mapVacationsForExport(list: VacationRequest[]): Record<string, unknown>[] {
    return list.map(r => ({
        ...r,
        _employeeName: r.employee.name,
        _employeeJobTitle: r.employee.jobTitle ?? '',
    }))
}

// ---- Component ----

interface VacationsClientProps {
    requests: VacationRequest[]
    employees: Employee[]
}

export function VacationsClient({ requests, employees }: VacationsClientProps) {
    const { toast } = useToast()

    // Dialog states
    const [formOpen, setFormOpen] = useState(false)
    const [approveOpen, setApproveOpen] = useState(false)
    const [rejectOpen, setRejectOpen] = useState(false)

    // Selected request for actions
    const [editingRequest, setEditingRequest] = useState<VacationRequest | null>(null)
    const [actionRequest, setActionRequest] = useState<VacationRequest | null>(null)

    // Loading state
    const [loading, setLoading] = useState(false)

    // Filters
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState<LeaveType | 'ALL'>('ALL')
    const [filterStatus, setFilterStatus] = useState<LeaveStatus | 'ALL'>('ALL')

    // Live days calculation
    const [calculatedDays, setCalculatedDays] = useState(0)

    // ---- Main Form ----
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            employeeId: '',
            type: 'VACATION',
            startDate: '',
            endDate: '',
            reason: '',
        },
    })

    const startDateWatched = form.watch('startDate')
    const endDateWatched = form.watch('endDate')

    useEffect(() => {
        setCalculatedDays(calculateDays(startDateWatched, endDateWatched))
    }, [startDateWatched, endDateWatched])

    // ---- Approve Form ----
    const approveForm = useForm<ApproveValues>({
        resolver: zodResolver(approveSchema),
        defaultValues: { approvedBy: '' },
    })

    // ---- Reject Form ----
    const rejectForm = useForm<RejectValues>({
        resolver: zodResolver(rejectSchema),
        defaultValues: { reason: '' },
    })

    // ---- Handlers ----

    function openCreate() {
        setEditingRequest(null)
        form.reset({
            employeeId: '',
            type: 'VACATION',
            startDate: '',
            endDate: '',
            reason: '',
        })
        setCalculatedDays(0)
        setFormOpen(true)
    }

    function openEdit(req: VacationRequest) {
        setEditingRequest(req)
        form.reset({
            employeeId: req.employeeId,
            type: req.type,
            startDate: new Date(req.startDate).toISOString().slice(0, 10),
            endDate: new Date(req.endDate).toISOString().slice(0, 10),
            reason: req.reason ?? '',
        })
        setCalculatedDays(req.days)
        setFormOpen(true)
    }

    function openApprove(req: VacationRequest) {
        setActionRequest(req)
        approveForm.reset({ approvedBy: '' })
        setApproveOpen(true)
    }

    function openReject(req: VacationRequest) {
        setActionRequest(req)
        rejectForm.reset({ reason: '' })
        setRejectOpen(true)
    }

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            if (editingRequest) {
                const result = await updateVacationRequest(editingRequest.id, {
                    employeeId: values.employeeId,
                    type: values.type,
                    startDate: values.startDate,
                    endDate: values.endDate,
                    reason: values.reason || null,
                    approvedBy: null,
                    notes: null,
                })
                if (result.success) {
                    toast({ title: "Solicitação atualizada com sucesso!" })
                    setFormOpen(false)
                } else {
                    toast({ variant: "destructive", title: "Erro", description: result.error })
                }
            } else {
                const result = await createVacationRequest({
                    employeeId: values.employeeId,
                    type: values.type,
                    startDate: values.startDate,
                    endDate: values.endDate,
                    reason: values.reason || null,
                    approvedBy: null,
                    notes: null,
                })
                if (result.success) {
                    toast({ title: "Solicitação criada com sucesso!" })
                    setFormOpen(false)
                } else {
                    toast({ variant: "destructive", title: "Erro", description: result.error })
                }
            }
        } finally {
            setLoading(false)
        }
    }

    async function onApprove(values: ApproveValues) {
        if (!actionRequest) return
        setLoading(true)
        try {
            const result = await approveVacationRequest(actionRequest.id, values.approvedBy)
            if (result.success) {
                toast({ title: "Solicitação aprovada com sucesso!" })
                setApproveOpen(false)
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    async function onReject(values: RejectValues) {
        if (!actionRequest) return
        setLoading(true)
        try {
            const result = await rejectVacationRequest(actionRequest.id, values.reason)
            if (result.success) {
                toast({ title: "Solicitação rejeitada." })
                setRejectOpen(false)
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(req: VacationRequest) {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir a solicitação de ${req.employee.name}? Esta ação não pode ser desfeita.`
        )
        if (!confirmed) return

        const result = await deleteVacationRequest(req.id)
        if (result.success) {
            toast({ title: "Solicitação excluída com sucesso!" })
        } else {
            toast({ variant: "destructive", title: "Erro ao excluir", description: result.error })
        }
    }

    // ---- Filtering ----

    const filtered = requests.filter(r => {
        const q = search.toLowerCase()
        const matchesSearch =
            r.employee.name.toLowerCase().includes(q) ||
            (r.employee.jobTitle ?? '').toLowerCase().includes(q)
        const matchesType = filterType === 'ALL' || r.type === filterType
        const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus
        return matchesSearch && matchesType && matchesStatus
    })

    // ---- Render ----

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Solicitações</h3>
                <div className="flex items-center gap-2">
                    <ExportButton
                        data={mapVacationsForExport(filtered)}
                        columns={vacationExportColumns}
                        filename="ferias_afastamentos"
                        title="Férias e Afastamentos"
                        sheetName="Férias"
                        size="sm"
                    />
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Solicitação
                    </Button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por funcionário ou cargo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select
                    value={filterType}
                    onValueChange={v => setFilterType(v as LeaveType | 'ALL')}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os tipos</SelectItem>
                        {(Object.keys(typeLabels) as LeaveType[]).map(key => (
                            <SelectItem key={key} value={key}>{typeLabels[key]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filterStatus}
                    onValueChange={v => setFilterStatus(v as LeaveStatus | 'ALL')}
                >
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os status</SelectItem>
                        <SelectItem value="PENDING">Pendente</SelectItem>
                        <SelectItem value="APPROVED">Aprovado</SelectItem>
                        <SelectItem value="REJECTED">Rejeitado</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Funcionário</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Início</TableHead>
                            <TableHead>Fim</TableHead>
                            <TableHead className="text-center">Dias</TableHead>
                            <TableHead>Aprovado por</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    {search || filterType !== 'ALL' || filterStatus !== 'ALL'
                                        ? "Nenhuma solicitação encontrada para os filtros aplicados."
                                        : "Nenhuma solicitação cadastrada. Clique em \"Nova Solicitação\" para começar."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="font-medium">{req.employee.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {req.employee.jobTitle ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-200" variant="outline">
                                            {typeLabels[req.type]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={req.status} />
                                    </TableCell>
                                    <TableCell className="text-sm">{formatDate(req.startDate)}</TableCell>
                                    <TableCell className="text-sm">{formatDate(req.endDate)}</TableCell>
                                    <TableCell className="text-center font-medium">{req.days}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {req.approvedBy ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {req.status === 'PENDING' && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => openApprove(req)}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                                            Aprovar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openReject(req)}>
                                                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                                            Rejeitar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openEdit(req)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(req)}
                                                            className="text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                {req.status === 'REJECTED' && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(req)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                )}
                                                {(req.status === 'APPROVED' || req.status === 'CANCELLED') && (
                                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                                        <span className="text-xs">Sem ações disponíveis</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRequest ? 'Editar Solicitação' : 'Nova Solicitação'}
                        </DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* Employee */}
                            <FormField
                                control={form.control}
                                name="employeeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Funcionário *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o funcionário" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {employees.map(e => (
                                                    <SelectItem key={e.id} value={e.id}>
                                                        {e.name}{e.jobTitle ? ` — ${e.jobTitle}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Type */}
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {(Object.keys(typeLabels) as LeaveType[]).map(key => (
                                                    <SelectItem key={key} value={key}>{typeLabels[key]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Dates */}
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
                                            <FormLabel>Data de Fim *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Live days display */}
                            {calculatedDays > 0 && (
                                <div className="rounded-md bg-muted/50 px-4 py-2 text-sm flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        <span className="font-semibold">{calculatedDays}</span> dia{calculatedDays !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            {/* Reason */}
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo / Observações</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descreva o motivo (opcional)..."
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading
                                        ? "Salvando..."
                                        : editingRequest
                                        ? "Salvar Alterações"
                                        : "Criar Solicitação"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Aprovar Solicitação
                        </DialogTitle>
                    </DialogHeader>

                    {actionRequest && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1 mb-2">
                            <p><span className="font-medium">Funcionário:</span> {actionRequest.employee.name}</p>
                            <p><span className="font-medium">Tipo:</span> {typeLabels[actionRequest.type]}</p>
                            <p>
                                <span className="font-medium">Período:</span>{' '}
                                {formatDate(actionRequest.startDate)} — {formatDate(actionRequest.endDate)}
                            </p>
                            <p><span className="font-medium">Dias:</span> {actionRequest.days}</p>
                        </div>
                    )}

                    <Form {...approveForm}>
                        <form onSubmit={approveForm.handleSubmit(onApprove)} className="space-y-4">
                            <FormField
                                control={approveForm.control}
                                name="approvedBy"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Aprovado por *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome do aprovador" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setApproveOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                                    {loading ? "Aprovando..." : "Confirmar Aprovação"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            Rejeitar Solicitação
                        </DialogTitle>
                    </DialogHeader>

                    {actionRequest && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1 mb-2">
                            <p><span className="font-medium">Funcionário:</span> {actionRequest.employee.name}</p>
                            <p><span className="font-medium">Tipo:</span> {typeLabels[actionRequest.type]}</p>
                            <p>
                                <span className="font-medium">Período:</span>{' '}
                                {formatDate(actionRequest.startDate)} — {formatDate(actionRequest.endDate)}
                            </p>
                        </div>
                    )}

                    <Form {...rejectForm}>
                        <form onSubmit={rejectForm.handleSubmit(onReject)} className="space-y-4">
                            <FormField
                                control={rejectForm.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo da Rejeição *</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Informe o motivo para rejeição..."
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading} variant="destructive">
                                    {loading ? "Rejeitando..." : "Confirmar Rejeição"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

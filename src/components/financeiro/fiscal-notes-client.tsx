'use client'

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
    createFiscalNote, updateFiscalNote, updateFiscalNoteStatus, deleteFiscalNote
} from "@/app/actions/fiscal-note-actions"
import { getCostCentersByProject } from "@/app/actions/cost-center-actions"
import {
    Plus, MoreHorizontal, CheckCircle, XCircle, Trash2, Pencil, Search
} from "lucide-react"

import { formatDate } from "@/lib/formatters"
// ─── Document type labels and groups ────────────────────────────────────────

export const DOC_TYPES: { value: string; label: string; group: string; icon?: React.ReactNode }[] = [
    { value: 'NFE',    label: 'NF-e (Nota Fiscal de Produto)',    group: 'Notas Fiscais' },
    { value: 'NFSE',   label: 'NFS-e (Nota Fiscal de Serviço)',   group: 'Notas Fiscais' },
    { value: 'CTE',    label: 'CT-e (Conhecimento de Transporte)',group: 'Notas Fiscais' },
    { value: 'FATURA', label: 'Fatura / Boleto',                   group: 'Cobranças' },
    { value: 'RECIBO', label: 'Recibo',                            group: 'Cobranças' },
    { value: 'CONTA_ENERGIA',   label: 'Conta de Energia Elétrica',  group: 'Contas de Consumo' },
    { value: 'CONTA_AGUA',      label: 'Conta de Água / Esgoto',     group: 'Contas de Consumo' },
    { value: 'CONTA_TELEFONE',  label: 'Conta de Telefone / Celular',group: 'Contas de Consumo' },
    { value: 'CONTA_INTERNET',  label: 'Conta de Internet',          group: 'Contas de Consumo' },
    { value: 'ALUGUEL', label: 'Aluguel',                           group: 'Outros' },
    { value: 'OUTRO',   label: 'Outro Documento',                   group: 'Outros' },
]

const typeShort: Record<string, string> = {
    NFE: 'NF-e', NFSE: 'NFS-e', CTE: 'CT-e',
    FATURA: 'Fatura', RECIBO: 'Recibo',
    CONTA_ENERGIA: 'Energia', CONTA_AGUA: 'Água', CONTA_TELEFONE: 'Telefone',
    CONTA_INTERNET: 'Internet', ALUGUEL: 'Aluguel', OUTRO: 'Outro',
}

const typeColor: Record<string, string> = {
    NFE: 'bg-blue-100 text-blue-800', NFSE: 'bg-blue-100 text-blue-800',
    CTE: 'bg-blue-100 text-blue-800', FATURA: 'bg-purple-100 text-purple-800',
    RECIBO: 'bg-indigo-100 text-indigo-800', CONTA_ENERGIA: 'bg-yellow-100 text-yellow-800',
    CONTA_AGUA: 'bg-cyan-100 text-cyan-800', CONTA_TELEFONE: 'bg-green-100 text-green-800',
    CONTA_INTERNET: 'bg-teal-100 text-teal-800', ALUGUEL: 'bg-orange-100 text-orange-800',
    OUTRO: 'bg-gray-100 text-gray-700',
}

const statusLabel: Record<string, string> = {
    DRAFT: 'Rascunho', ISSUED: 'Emitido', CANCELLED: 'Cancelado', DENIED: 'Denegado'
}
const statusColor: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    ISSUED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-700',
    DENIED: 'bg-orange-100 text-orange-700',
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Supplier = { id: string; name: string }
type Project = { id: string; name: string }
type CostCenter = { id: string; code: string; name: string; projectId?: string | null }

type Note = {
    id: string
    number: string
    series: string | null
    type: string
    description: string | null
    issuedDate: Date
    dueDate: Date | null
    value: number
    status: string
    accessKey: string | null
    supplierId: string | null
    supplier: Supplier | null
    companyId: string
    projectId?: string | null
    costCenterId?: string | null
}

interface FiscalNotesClientProps {
    companyId: string
    notes: Note[]
    suppliers: Supplier[]
    projects?: Project[]
    costCenters?: CostCenter[]
    mode: 'create-button' | 'table'
}

// ─── Form Schema ─────────────────────────────────────────────────────────────

const formSchema = z.object({
    number: z.string().min(1, "Número é obrigatório"),
    series: z.string().optional(),
    type: z.enum([
        'NFE', 'NFSE', 'CTE', 'FATURA', 'RECIBO',
        'CONTA_ENERGIA', 'CONTA_AGUA', 'CONTA_TELEFONE', 'CONTA_INTERNET',
        'ALUGUEL', 'OUTRO'
    ]),
    description: z.string().optional(),
    issuedDate: z.string().min(1, "Data é obrigatória"),
    dueDate: z.string().optional(),
    value: z.number().min(0, "Valor não pode ser negativo"),
    status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED', 'DENIED']).optional(),
    accessKey: z.string().optional(),
    supplierId: z.string().optional(),
    projectId: z.string().optional(),
    costCenterId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

// ─── Note Form Dialog ─────────────────────────────────────────────────────────

function NoteFormDialog({
    companyId,
    suppliers,
    projects = [],
    costCenters: initialCostCenters = [],
    editNote,
    onClose,
}: {
    companyId: string
    suppliers: Supplier[]
    projects?: Project[]
    costCenters?: CostCenter[]
    editNote?: Note
    onClose: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [costCenters, setCostCenters] = useState(initialCostCenters)
    const { toast } = useToast()
    const isEdit = Boolean(editNote)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: editNote ? {
            number: editNote.number,
            series: editNote.series || '',
            type: editNote.type as FormValues['type'],
            description: editNote.description || '',
            issuedDate: new Date(editNote.issuedDate).toISOString().split('T')[0],
            dueDate: editNote.dueDate ? new Date(editNote.dueDate).toISOString().split('T')[0] : '',
            value: editNote.value,
            status: editNote.status as FormValues['status'],
            accessKey: editNote.accessKey || '',
            supplierId: editNote.supplierId || '',
            projectId: editNote.projectId || '',
            costCenterId: editNote.costCenterId || '',
        } : {
            number: '',
            series: '',
            type: 'NFSE',
            description: '',
            issuedDate: new Date().toISOString().split('T')[0],
            dueDate: '',
            value: 0,
            status: 'ISSUED',
            accessKey: '',
            supplierId: '',
            projectId: '',
            costCenterId: '',
        }
    })

    const selectedType = form.watch('type')
    const selectedProjectId = form.watch('projectId')
    const showAccessKey = ['NFE', 'NFSE', 'CTE'].includes(selectedType)
    const showDueDate = ['FATURA', 'RECIBO', 'CONTA_ENERGIA', 'CONTA_AGUA', 'CONTA_TELEFONE', 'CONTA_INTERNET', 'ALUGUEL'].includes(selectedType)

    useEffect(() => {
        if (selectedProjectId && selectedProjectId !== '') {
            getCostCentersByProject(selectedProjectId, companyId).then((res) => {
                if (res.success) setCostCenters(res.data)
            })
        } else {
            setCostCenters(initialCostCenters)
        }
    }, [selectedProjectId, companyId, initialCostCenters])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const payload = {
                ...values,
                series: values.series || null,
                description: values.description || null,
                dueDate: values.dueDate || null,
                accessKey: values.accessKey || null,
                supplierId: values.supplierId || null,
                projectId: values.projectId || null,
                costCenterId: values.costCenterId || null,
                companyId,
            }

            const result = isEdit
                ? await updateFiscalNote(editNote!.id, payload)
                : await createFiscalNote(payload)

            if (result.success) {
                toast({ title: isEdit ? "Documento atualizado!" : "Documento registrado!" })
                onClose()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    // Group DOC_TYPES for better Select display
    const groups = ['Notas Fiscais', 'Cobranças', 'Contas de Consumo', 'Outros']

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Type + Status */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Documento *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {groups.map(group => (
                                        <div key={group}>
                                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                                                {group}
                                            </div>
                                            {DOC_TYPES.filter(t => t.group === group).map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                                    <SelectItem value="ISSUED">Emitido</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                {/* Supplier */}
                <FormField control={form.control} name="supplierId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fornecedor / Emissor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione o fornecedor (opcional)" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="">— Sem fornecedor —</SelectItem>
                                {suppliers.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Number + Series */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <FormField control={form.control} name="number" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número *</FormLabel>
                                <FormControl><Input placeholder="000001" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="series" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Série</FormLabel>
                            <FormControl><Input placeholder="A" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                {/* Description */}
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Descrição / Referência</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Ex: Serviços de engenharia – Fev/2026"
                                rows={2}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="issuedDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data de Emissão *</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    {showDueDate && (
                        <FormField control={form.control} name="dueDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Vencimento</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}
                    <FormField control={form.control} name="value" render={({ field }) => (
                        <FormItem className={showDueDate ? 'col-span-2' : ''}>
                            <FormLabel>Valor (R$) *</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                {/* Access Key — only for NF-e / CT-e */}
                {showAccessKey && (
                    <FormField control={form.control} name="accessKey" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chave de Acesso</FormLabel>
                            <FormControl>
                                <Input placeholder="44 dígitos (opcional)" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}

                {/* Project + Cost Center */}
                <div className="grid grid-cols-2 gap-4">
                    {projects.length > 0 && (
                        <FormField control={form.control} name="projectId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Projeto</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="">Nenhum</SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}
                    {costCenters.length > 0 && (
                        <FormField control={form.control} name="costCenterId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Centro de Custo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="">Nenhum</SelectItem>
                                        {costCenters.map(cc => (
                                            <SelectItem key={cc.id} value={cc.id}>{cc.code} — {cc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Registrar Documento"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

// ─── Create Button ────────────────────────────────────────────────────────────

function CreateNoteButton({ companyId, suppliers, projects = [], costCenters = [] }: { companyId: string; suppliers: Supplier[]; projects?: Project[]; costCenters?: CostCenter[] }) {
    const [open, setOpen] = useState(false)
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Documento
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Documento Fiscal</DialogTitle>
                </DialogHeader>
                <NoteFormDialog
                    companyId={companyId}
                    suppliers={suppliers}
                    projects={projects}
                    costCenters={costCenters}
                    onClose={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}

// ─── Notes Table ──────────────────────────────────────────────────────────────

function NotesTable({ notes, companyId, suppliers, projects = [], costCenters = [] }: { notes: Note[]; companyId: string; suppliers: Supplier[]; projects?: Project[]; costCenters?: CostCenter[] }) {
    const { toast } = useToast()
    const [editNote, setEditNote] = useState<Note | null>(null)
    const [search, setSearch] = useState('')

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    const fmtDate = (d: Date | null) => d ? formatDate(d) : '—'

    const filtered = useMemo(() => {
        if (!search.trim()) return notes
        const q = search.toLowerCase()
        return notes.filter(n =>
            n.number.toLowerCase().includes(q) ||
            (n.supplier?.name.toLowerCase().includes(q) ?? false) ||
            (n.description?.toLowerCase().includes(q) ?? false) ||
            typeShort[n.type]?.toLowerCase().includes(q)
        )
    }, [notes, search])

    async function handleStatusChange(id: string, status: 'ISSUED' | 'CANCELLED' | 'DENIED') {
        const result = await updateFiscalNoteStatus(id, status)
        if (result.success) {
            toast({ title: "Status atualizado!" })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    async function handleDelete(id: string) {
        if (!window.confirm("Excluir este documento? Esta ação não pode ser desfeita.")) return
        const result = await deleteFiscalNote(id)
        if (result.success) {
            toast({ title: "Documento excluído!" })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    return (
        <div className="space-y-4">
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="Buscar por número, fornecedor..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                    {notes.length === 0
                        ? 'Nenhum documento registrado. Clique em "Novo Documento" para começar.'
                        : 'Nenhum documento encontrado para a busca.'}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-muted-foreground text-xs">
                                <th className="text-left py-2 pr-3">Tipo</th>
                                <th className="text-left py-2 pr-3">Número</th>
                                <th className="text-left py-2 pr-3">Fornecedor</th>
                                <th className="text-left py-2 pr-3">Descrição</th>
                                <th className="text-left py-2 pr-3">Emissão</th>
                                <th className="text-left py-2 pr-3">Vencimento</th>
                                <th className="text-right py-2 pr-3">Valor</th>
                                <th className="text-center py-2 pr-3">Status</th>
                                <th className="text-center py-2">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(note => (
                                <tr key={note.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="py-2 pr-3">
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${typeColor[note.type] || 'bg-gray-100 text-gray-700'}`}>
                                            {typeShort[note.type] || note.type}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3 font-medium whitespace-nowrap">
                                        {note.number}{note.series ? `-${note.series}` : ''}
                                    </td>
                                    <td className="py-2 pr-3 text-muted-foreground max-w-[140px] truncate">
                                        {note.supplier?.name || <span className="text-xs italic">—</span>}
                                    </td>
                                    <td className="py-2 pr-3 text-muted-foreground max-w-[160px] truncate text-xs">
                                        {note.description || '—'}
                                    </td>
                                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                                        {fmtDate(note.issuedDate)}
                                    </td>
                                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                                        {fmtDate(note.dueDate)}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">
                                        {fmt(note.value)}
                                    </td>
                                    <td className="py-2 pr-3 text-center">
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor[note.status] || 'bg-gray-100'}`}>
                                            {statusLabel[note.status] || note.status}
                                        </span>
                                    </td>
                                    <td className="py-2 text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditNote(note)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {note.status === 'DRAFT' && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(note.id, 'ISSUED')}>
                                                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                                        Marcar como Emitido
                                                    </DropdownMenuItem>
                                                )}
                                                {note.status === 'ISSUED' && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(note.id, 'CANCELLED')}>
                                                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                                        Cancelar
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                {note.status !== 'ISSUED' && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(note.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Dialog */}
            {editNote && (
                <Dialog open={Boolean(editNote)} onOpenChange={() => setEditNote(null)}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Editar Documento Fiscal</DialogTitle>
                        </DialogHeader>
                        <NoteFormDialog
                            companyId={companyId}
                            suppliers={suppliers}
                            projects={projects}
                            costCenters={costCenters}
                            editNote={editNote}
                            onClose={() => setEditNote(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function FiscalNotesClient({ companyId, notes, suppliers, projects = [], costCenters = [], mode }: FiscalNotesClientProps) {
    if (mode === 'create-button') {
        return <CreateNoteButton companyId={companyId} suppliers={suppliers} projects={projects} costCenters={costCenters} />
    }
    return <NotesTable notes={notes} companyId={companyId} suppliers={suppliers} projects={projects} costCenters={costCenters} />
}

'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createFinancialRecord, updateFinancialRecord } from "@/app/actions/financial-actions"
import { getCostCentersByProject } from "@/app/actions/cost-center-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    description: z.string().min(3, "Descrição é obrigatória"),
    amount: z.number().min(0.01, "Valor deve ser maior que zero"),
    type: z.enum(['INCOME', 'EXPENSE']),
    status: z.enum(['PENDING', 'PAID', 'CANCELLED', 'SCHEDULED']).optional(),
    dueDate: z.string(),
    bankAccountId: z.string().optional().or(z.literal('')),
    category: z.string().optional().or(z.literal('')),
    projectId: z.string().optional().or(z.literal('')),
    costCenterId: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface FinancialRecordDialogProps {
    companyId: string
    record?: any
    bankAccounts?: any[]
    projects?: Array<{ id: string; name: string }>
    costCenters?: Array<{ id: string; code: string; name: string; projectId?: string | null }>
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function FinancialRecordDialog({ companyId, record, bankAccounts = [], projects = [], costCenters: initialCostCenters = [], trigger, open: controlledOpen, onOpenChange }: FinancialRecordDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [costCenters, setCostCenters] = useState(initialCostCenters)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: record?.description || "",
            amount: record?.amount ? Number(record.amount) : 0,
            type: record?.type || 'INCOME',
            status: record?.status || 'PENDING',
            dueDate: record?.dueDate ? new Date(record.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            bankAccountId: record?.bankAccountId || "",
            category: record?.category || "",
            projectId: record?.projectId || "",
            costCenterId: record?.costCenterId || "",
        }
    })

    const selectedProjectId = form.watch('projectId')

    useEffect(() => {
        if (selectedProjectId && selectedProjectId !== '') {
            getCostCentersByProject(selectedProjectId, companyId).then((res) => {
                if (res.success) setCostCenters(res.data)
            })
        } else {
            setCostCenters(initialCostCenters)
        }
    }, [selectedProjectId, companyId, initialCostCenters])

    useEffect(() => {
        if (open && record) {
            form.reset({
                description: record.description,
                amount: Number(record.amount),
                type: record.type,
                status: record.status,
                dueDate: new Date(record.dueDate).toISOString().split('T')[0],
                bankAccountId: record.bankAccountId || "",
                category: record.category || "",
                projectId: record.projectId || "",
                costCenterId: record.costCenterId || "",
            })
        }
    }, [open, record, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const data = {
                ...values,
                bankAccountId: values.bankAccountId || null,
                category: values.category || null,
                projectId: values.projectId || null,
                costCenterId: values.costCenterId || null,
                companyId,
            }

            const result = record
                ? await updateFinancialRecord(record.id, data)
                : await createFinancialRecord(data)

            if (result.success) {
                toast({
                    title: record ? "Lançamento Atualizado" : "Lançamento Criado",
                    description: `${values.description} foi ${record ? 'atualizado' : 'criado'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
                window.location.reload()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro inesperado", description: "Tente novamente." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Lançamento
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{record ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
                    <DialogDescription>
                        Registre receitas e despesas da empresa.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl><Input placeholder="Ex: Faturamento BM-001/2026" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="INCOME">Receita</SelectItem>
                                                <SelectItem value="EXPENSE">Despesa</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor (R$) *</FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="dueDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vencimento *</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="PENDING">Pendente</SelectItem>
                                                <SelectItem value="PAID">Pago</SelectItem>
                                                <SelectItem value="SCHEDULED">Agendado</SelectItem>
                                                <SelectItem value="CANCELLED">Cancelado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoria</FormLabel>
                                        <FormControl><Input placeholder="Ex: Serviços, Material" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {bankAccounts.length > 0 && (
                                <FormField control={form.control} name="bankAccountId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Conta Bancária</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="">Nenhuma</SelectItem>
                                                    {bankAccounts.map(a => (
                                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {projects.length > 0 && (
                                <FormField control={form.control} name="projectId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Projeto</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="">Nenhum</SelectItem>
                                                    {projects.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            {costCenters.length > 0 && (
                                <FormField control={form.control} name="costCenterId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Centro de Custo</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="">Nenhum</SelectItem>
                                                    {costCenters.map(cc => (
                                                        <SelectItem key={cc.id} value={cc.id}>{cc.code} — {cc.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {record ? 'Atualizar' : 'Criar'} Lançamento
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

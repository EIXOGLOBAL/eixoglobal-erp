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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createBilling } from "@/app/actions/billing-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
    value: z.number().min(0.01, "Valor deve ser maior que zero"),
    dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
    projectId: z.string().optional().or(z.literal('')),
    contractId: z.string().optional().or(z.literal('')),
    clientId: z.string().optional().or(z.literal('')),
    measurementBulletinId: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface BillingDialogProps {
    formData: {
        projects: Array<{ id: string; name: string; clientId: string | null }>
        clients: Array<{ id: string; displayName: string }>
        contracts: Array<{ id: string; identifier: string; projectId: string; value: number | null }>
        bulletins: Array<{ id: string; number: string; totalValue: number; projectId: string; contractId: string }>
    }
}

export function BillingDialog({ formData }: BillingDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            value: 0,
            dueDate: new Date().toISOString().split('T')[0],
            projectId: "",
            contractId: "",
            clientId: "",
            measurementBulletinId: "",
            notes: "",
        }
    })

    const selectedProjectId = form.watch('projectId')
    const selectedBulletinId = form.watch('measurementBulletinId')

    // Filter contracts & bulletins by selected project
    const filteredContracts = selectedProjectId
        ? formData.contracts.filter(c => c.projectId === selectedProjectId)
        : formData.contracts

    const filteredBulletins = selectedProjectId
        ? formData.bulletins.filter(b => b.projectId === selectedProjectId)
        : formData.bulletins

    // Auto-fill when bulletin selected
    useEffect(() => {
        if (selectedBulletinId) {
            const bulletin = formData.bulletins.find(b => b.id === selectedBulletinId)
            if (bulletin) {
                form.setValue('value', bulletin.totalValue)
                form.setValue('description', `Faturamento ${bulletin.number}`)
                if (bulletin.projectId) form.setValue('projectId', bulletin.projectId)
                if (bulletin.contractId) form.setValue('contractId', bulletin.contractId)
            }
        }
    }, [selectedBulletinId, formData.bulletins, form])

    // Auto-fill client from project
    useEffect(() => {
        if (selectedProjectId) {
            const project = formData.projects.find(p => p.id === selectedProjectId)
            if (project?.clientId) {
                form.setValue('clientId', project.clientId)
            }
        }
    }, [selectedProjectId, formData.projects, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await createBilling({
                description: values.description,
                value: values.value,
                dueDate: values.dueDate,
                projectId: values.projectId || null,
                contractId: values.contractId || null,
                clientId: values.clientId || null,
                measurementBulletinId: values.measurementBulletinId || null,
                notes: values.notes || null,
            })

            if (result.success) {
                toast({ title: "Faturamento Criado", description: `${values.description} criado com sucesso.` })
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
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Faturamento
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Faturamento</DialogTitle>
                    <DialogDescription>
                        Crie um faturamento vinculado a projeto, contrato ou boletim de medicao.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Measurement Bulletin (optional) */}
                        {filteredBulletins.length > 0 && (
                            <FormField control={form.control} name="measurementBulletinId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Boletim de Medicao (opcional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Selecione um boletim aprovado..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Nenhum</SelectItem>
                                                {filteredBulletins.map(b => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {b.number} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.totalValue)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField control={form.control} name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descricao *</FormLabel>
                                    <FormControl><Input placeholder="Ex: Faturamento BM-001/2026" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor (R$) *</FormLabel>
                                        <FormControl>
                                            <CurrencyInput value={field.value} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="dueDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vencimento *</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="clientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cliente</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Nenhum</SelectItem>
                                                {formData.clients.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projeto</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Nenhum</SelectItem>
                                                {formData.projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {filteredContracts.length > 0 && (
                            <FormField control={form.control} name="contractId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contrato</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Nenhum</SelectItem>
                                                {filteredContracts.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.identifier}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField control={form.control} name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observacoes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Observacoes adicionais..." rows={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Faturamento
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

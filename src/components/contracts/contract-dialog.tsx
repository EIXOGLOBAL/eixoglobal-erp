'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createContract, updateContract } from "@/app/actions/contract-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    identifier: z.string().min(3, "Identificador deve ter no mínimo 3 caracteres"),
    contractNumber: z.string().optional(),
    description: z.string().optional(),
    projectId: z.string().min(1, "Selecione um projeto"),
    contractorId: z.string().optional().nullable(),
    value: z.number().min(0, "Valor deve ser positivo").optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'COMPLETED', 'CANCELLED']).optional(),
    contractType: z.string().optional(),
    modalidade: z.string().optional(),
    object: z.string().optional(),
    warrantyValue: z.number().min(0).optional(),
    warrantyExpiry: z.string().optional(),
    executionDeadline: z.number().min(1).optional(),
    baselineEndDate: z.string().optional(),
    reajusteIndex: z.string().optional(),
    reajusteBaseDate: z.string().optional(),
    fiscalName: z.string().optional(),
    witnessNames: z.string().optional(),
    paymentTerms: z.string().optional(),
    retentionPercent: z.number().min(0).max(100).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ContractDialogProps {
    projects: { id: string; name: string }[]
    contractors: { id: string; name: string }[]
    companyId: string
    contract?: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ContractDialog({
    projects,
    contractors,
    companyId,
    contract,
    trigger,
    open: controlledOpen,
    onOpenChange,
}: ContractDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            identifier: contract?.identifier || "",
            contractNumber: contract?.contractNumber || "",
            description: contract?.description || "",
            projectId: contract?.projectId || "",
            contractorId: contract?.contractorId || "",
            value: contract?.value ? Number(contract.value) : 0,
            startDate: contract?.startDate
                ? new Date(contract.startDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            endDate: contract?.endDate
                ? new Date(contract.endDate).toISOString().split('T')[0]
                : "",
            status: contract?.status || 'DRAFT',
            contractType: contract?.contractType || "",
            modalidade: contract?.modalidade || "",
            object: contract?.object || "",
            warrantyValue: contract?.warrantyValue ? Number(contract.warrantyValue) : 0,
            warrantyExpiry: contract?.warrantyExpiry
                ? new Date(contract.warrantyExpiry).toISOString().split('T')[0]
                : "",
            executionDeadline: contract?.executionDeadline || 0,
            baselineEndDate: contract?.baselineEndDate
                ? new Date(contract.baselineEndDate).toISOString().split('T')[0]
                : "",
            reajusteIndex: contract?.reajusteIndex || "",
            reajusteBaseDate: contract?.reajusteBaseDate
                ? new Date(contract.reajusteBaseDate).toISOString().split('T')[0]
                : "",
            fiscalName: contract?.fiscalName || "",
            witnessNames: contract?.witnessNames || "",
            paymentTerms: contract?.paymentTerms || "",
            retentionPercent: contract?.retentionPercent ? Number(contract.retentionPercent) : 0,
        }
    })

    useEffect(() => {
        if (open && contract) {
            form.reset({
                identifier: contract.identifier,
                contractNumber: contract.contractNumber || "",
                description: contract.description || "",
                projectId: contract.projectId,
                contractorId: contract.contractorId || "",
                value: Number(contract.value) || 0,
                startDate: new Date(contract.startDate).toISOString().split('T')[0],
                endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : "",
                status: contract.status,
                contractType: contract.contractType || "",
                modalidade: contract.modalidade || "",
                object: contract.object || "",
                warrantyValue: contract.warrantyValue ? Number(contract.warrantyValue) : 0,
                warrantyExpiry: contract.warrantyExpiry ? new Date(contract.warrantyExpiry).toISOString().split('T')[0] : "",
                executionDeadline: contract.executionDeadline || 0,
                baselineEndDate: contract.baselineEndDate ? new Date(contract.baselineEndDate).toISOString().split('T')[0] : "",
                reajusteIndex: contract.reajusteIndex || "",
                reajusteBaseDate: contract.reajusteBaseDate ? new Date(contract.reajusteBaseDate).toISOString().split('T')[0] : "",
                fiscalName: contract.fiscalName || "",
                witnessNames: contract.witnessNames || "",
                paymentTerms: contract.paymentTerms || "",
                retentionPercent: contract.retentionPercent ? Number(contract.retentionPercent) : 0,
            })
        }
    }, [open, contract, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            // Garantir que status sempre tenha um valor
            const data = {
                ...values,
                status: values.status || 'DRAFT' as const,
            }

            const result = contract
                ? await updateContract(contract.id, data as any)
                : await createContract(data as any, companyId)

            if (result.success) {
                toast({
                    title: contract ? "Contrato Atualizado" : "Contrato Criado",
                    description: `${values.identifier} foi ${contract ? 'atualizado' : 'criado'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
                window.location.reload() // Temporary - should use router.refresh()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro inesperado",
                description: "Tente novamente mais tarde.",
            })
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
                            Novo Contrato
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{contract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
                    <DialogDescription>
                        {contract ? 'Atualize as informações do contrato.' : 'Cadastre um novo contrato no sistema.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Tabs defaultValue="dados-gerais" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
                                <TabsTrigger value="valores-prazos">Valores e Prazos</TabsTrigger>
                                <TabsTrigger value="garantias">Garantias</TabsTrigger>
                            </TabsList>

                            {/* TAB 1: Dados Gerais */}
                            <TabsContent value="dados-gerais" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="identifier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Identificador *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: CTR-2026/001" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="contractNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número do Contrato</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: 2026-001" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="projectId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Projeto *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o projeto" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {projects.map((project) => (
                                                            <SelectItem key={project.id} value={project.id}>
                                                                {project.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="contractorId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Contratada</FormLabel>
                                                <Select
                                                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                                                    defaultValue={field.value || '__none__'}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione (opcional)" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">Nenhuma</SelectItem>
                                                        {contractors.map((contractor) => (
                                                            <SelectItem key={contractor.id} value={contractor.id}>
                                                                {contractor.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="contractType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Contrato</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Obra, Serviços, Fornecimento" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="modalidade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Modalidade de Licitação</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Licitação, Dispensa, Inexigibilidade" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="object"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Objeto do Contrato</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Descrição detalhada do objeto..."
                                                    className="resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição Adicional</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Observações gerais..."
                                                    className="resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-3 gap-4">
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
                                                    <Input type="date" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                                                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                                                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                                                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>

                            {/* TAB 2: Valores e Prazos */}
                            <TabsContent value="valores-prazos" className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor do Contrato (R$)</FormLabel>
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

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="executionDeadline"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prazo de Execução (dias)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Ex: 365"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="baselineEndDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data Final da Linha Base</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="reajusteIndex"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Índice de Reajuste</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: IPCA, IGP-M" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reajusteBaseDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data Base do Reajuste</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="retentionPercent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Percentual de Retenção (%)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        placeholder="Ex: 5"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="paymentTerms"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Condições de Pagamento</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Ex: À vista, 30 dias, conforme medição..."
                                                        className="resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>

                            {/* TAB 3: Garantias e Fiscal */}
                            <TabsContent value="garantias" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="warrantyValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valor da Garantia (R$)</FormLabel>
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

                                    <FormField
                                        control={form.control}
                                        name="warrantyExpiry"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Validade da Garantia</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="fiscalName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Fiscal</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome completo do fiscal" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="witnessNames"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nomes das Testemunhas</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Nomes separados por vírgula..."
                                                    className="resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {contract ? 'Atualizar' : 'Criar'} Contrato
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

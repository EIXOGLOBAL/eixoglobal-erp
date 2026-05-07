'use client'
import { useRouter } from 'next/navigation'

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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SpellCheckTextarea } from '@/components/ui/spell-check-textarea'
import { useToast } from "@/hooks/use-toast"
import { createProject, updateProject } from "@/app/actions/project-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { CepInput } from "@/components/ui/cep-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    description: z.string().optional(),
    companyId: z.string().min(1, "Selecione uma empresa"),
    startDate: z.string(),
    endDate: z.string().optional(),
    budget: z.number().min(0, "Orçamento deve ser positivo").optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    address: z.string().optional(),
    cep: z.string().optional(),
    area: z.number().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface ProjectDialogProps {
    companies: { id: string; name: string }[]
    clients?: { id: string; displayName: string }[]
    project?: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ProjectDialog({
  companies, clients = [], project, trigger, open: controlledOpen, onOpenChange }: ProjectDialogProps) {
  const router = useRouter()
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: project?.name || "",
            description: project?.description || "",
            companyId: project?.companyId || "",
            startDate: project?.startDate
                ? new Date(project.startDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            endDate: project?.endDate
                ? new Date(project.endDate).toISOString().split('T')[0]
                : "",
            budget: project?.budget ? Number(project.budget) : 0,
            status: project?.status || 'PLANNING',
            latitude: project?.latitude ? Number(project.latitude) : undefined,
            longitude: project?.longitude ? Number(project.longitude) : undefined,
            address: project?.address || "",
            clientId: project?.clientId || null,
        }
    })

    useEffect(() => {
        if (open && project) {
            form.reset({
                name: project.name,
                description: project.description || "",
                companyId: project.companyId,
                startDate: new Date(project.startDate).toISOString().split('T')[0],
                endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
                budget: Number(project.budget) || 0,
                status: project.status,
                latitude: project.latitude ? Number(project.latitude) : undefined,
                longitude: project.longitude ? Number(project.longitude) : undefined,
                address: project.address || "",
                clientId: project.clientId || null,
            })
        }
    }, [open, project, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = project
                ? await updateProject(project.id, values)
                : await createProject(values)

            if (result.success) {
                toast({
                    title: project ? "Projeto Atualizado" : "Projeto Criado",
                    description: `${values.name} foi ${project ? 'atualizado' : 'criado'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
                router.refresh() // Temporary - should use router.refresh()
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
                            Novo Projeto
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{project ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
                    <DialogDescription>
                        {project ? 'Atualize as informações do projeto.' : 'Cadastre um novo projeto no sistema.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Projeto *</FormLabel>
                                    <FormControl>
                                        <Input autoFocus placeholder="Ex: Construção Edifício ABC" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="companyId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Empresa Cliente *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a empresa" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {companies.map((company) => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {clients.length > 0 && (
                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cliente da Obra (opcional)</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
                                            value={field.value || '__none__'}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o cliente" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="__none__">Sem cliente vinculado</SelectItem>
                                                {clients.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.displayName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

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
                                name="budget"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Orçamento (R$)</FormLabel>
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
                                                <SelectItem value="PLANNING">Planejamento</SelectItem>
                                                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                                                <SelectItem value="ON_HOLD">Em Espera</SelectItem>
                                                <SelectItem value="COMPLETED">Concluído</SelectItem>
                                                <SelectItem value="CANCELLED">Cancelado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="area"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Área (m²)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Ex: 1500.00"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <SpellCheckTextarea
                                            placeholder="Detalhes sobre o projeto..."
                                            className="resize-none"
                                            spellCheckEnabled
                                            autoCorrectOnBlur
                                            fieldName="description"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="latitude"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Latitude</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="any"
                                                placeholder="-15.7801"
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="longitude"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Longitude</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="any"
                                                placeholder="-47.9292"
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="cep"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CEP</FormLabel>
                                    <FormControl>
                                        <CepInput
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            onAddressFill={(addr) => {
                                                form.setValue('address', `${addr.street}, ${addr.neighborhood}, ${addr.city} - ${addr.state}`)
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Endereço (opcional)</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ex: Av. Paulista, 1000, São Paulo - SP"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {project ? 'Atualizar' : 'Criar'} Projeto
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

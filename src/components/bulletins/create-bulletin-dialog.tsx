'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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
import { useToast } from "@/hooks/use-toast"
import { createMeasurementBulletin } from "@/app/actions/bulletin-actions"
import { useRouter } from "next/navigation"
import Link from "next/link"

const formSchema = z.object({
    projectId: z.string().min(1, "Selecione um projeto"),
    contractId: z.string().min(1, "Selecione um contrato"),
    referenceMonth: z.string().regex(/^\d{2}\/\d{4}$/, "Formato inválido (MM/AAAA)"),
    periodStart: z.string().min(1, "Data inicial obrigatória"),
    periodEnd: z.string().min(1, "Data final obrigatória"),
})

interface CreateBulletinDialogProps {
    projects: {
        id: string
        name: string
        contracts: {
            id: string
            identifier: string
        }[]
    }[]
    userId: string
    defaultProjectId?: string
}

export function CreateBulletinDialog({ projects, userId, defaultProjectId }: CreateBulletinDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectId: defaultProjectId || "",
            contractId: "",
            referenceMonth: format(new Date(), "MM/yyyy"), // Default to current month
            periodStart: format(new Date(), "yyyy-MM-01"), // First day of current month
            periodEnd: format(new Date(), "yyyy-MM-dd"), // Today
        },
    })

    const selectedProjectId = form.watch("projectId")
    const selectedProject = projects.find(p => p.id === selectedProjectId)
    const contracts = selectedProject?.contracts || []
    const hasProjects = projects.length > 0
    const projectHasContracts = contracts.length > 0

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsPending(true)
        try {
            const result = await createMeasurementBulletin(userId, {
                ...values,
                items: [], // Empty list triggers auto-populate in backend
            })

            if (result.success && result.data) {
                toast({
                    title: "Boletim criado com sucesso",
                    description: `Boletim ${result.data.number} gerado.`,
                })
                setOpen(false)
                form.reset()
                // Redirect directly to the edit page
                router.push(`/measurements/${result.data.id}`)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao criar boletim",
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
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Boletim
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Criar Boletim de Medição</DialogTitle>
                    <DialogDescription>
                        Crie um novo boletim para registrar medições. Os itens do contrato serão carregados automaticamente.
                    </DialogDescription>
                </DialogHeader>
                {/* Prerequisites check */}
                {!hasProjects && (
                    <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">Nenhum projeto cadastrado</p>
                            <p className="text-xs mt-1">
                                Para criar uma medição é necessário ter um{' '}
                                <Link href="/projects" className="underline font-medium" onClick={() => setOpen(false)}>
                                    Projeto
                                </Link>
                                {' '}→ Contrato com itens → Medição.
                            </p>
                        </div>
                    </div>
                )}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Projeto</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            form.setValue("contractId", "") // Reset contract when project changes
                                        }}
                                        defaultValue={field.value}
                                    >
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
                            name="contractId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contrato</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={!selectedProjectId || contracts.length === 0}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={contracts.length === 0 ? "Nenhum contrato disponível" : "Selecione o contrato"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {contracts.map((contract) => (
                                                <SelectItem key={contract.id} value={contract.id}>
                                                    {contract.identifier}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedProjectId && !projectHasContracts && (
                                        <p className="text-xs text-orange-700 flex items-center gap-1 mt-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Este projeto não tem contratos.{' '}
                                            <Link href="/contratos" className="underline" onClick={() => setOpen(false)}>
                                                Criar contrato →
                                            </Link>
                                        </p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="referenceMonth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mês Referência</FormLabel>
                                        <FormControl>
                                            <Input placeholder="MM/AAAA" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="periodStart"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Início do Período</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="periodEnd"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fim do Período</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Criando...
                                    </>
                                ) : (
                                    "Criar Boletim"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil } from "lucide-react"
import { createContractor, updateContractor } from "@/app/actions/contractor-actions"
import { CpfInput } from "@/components/ui/cpf-input"
import { CnpjInput } from "@/components/ui/cnpj-input"

const schema = z.object({
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    document: z.string().optional(),
    type: z.enum(['COMPANY', 'INDIVIDUAL']),
})

type FormValues = z.infer<typeof schema>

interface Contractor {
    id: string
    name: string
    document: string | null
    type: 'COMPANY' | 'INDIVIDUAL'
}

interface ContractorDialogProps {
    companyId: string
    contractor?: Contractor
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ContractorDialog({ companyId, contractor, open: controlledOpen, onOpenChange }: ContractorDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
    const { toast } = useToast()
    const isEdit = !!contractor

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: contractor?.name || "",
            document: contractor?.document || "",
            type: contractor?.type || 'COMPANY',
        },
    })

    const contractorType = form.watch('type')

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = isEdit
                ? await updateContractor(contractor!.id, values)
                : await createContractor(values, companyId)

            if (result.success) {
                toast({ title: isEdit ? "Empreiteira atualizada!" : "Empreiteira cadastrada!" })
                setOpen(false)
                form.reset()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    {isEdit ? (
                        <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Empreiteira
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Empreiteira" : "Nova Empreiteira"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Atualize os dados da empreiteira." : "Cadastre uma nova empreiteira ou subcontratada."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome / Razão Social</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Construtora ABC Ltda" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="COMPANY">Pessoa Jurídica (CNPJ)</SelectItem>
                                            <SelectItem value="INDIVIDUAL">Pessoa Física (CPF)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="document"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CNPJ / CPF</FormLabel>
                                    <FormControl>
                                        {contractorType === 'COMPANY' ? (
                                            <CnpjInput
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                onDataFill={(data) => {
                                                    if (data.razaoSocial) form.setValue('name', data.razaoSocial)
                                                }}
                                            />
                                        ) : (
                                            <CpfInput
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isEdit ? "Salvar Alterações" : "Cadastrar"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

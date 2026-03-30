'use client'

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
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useTransition, useEffect } from "react"
import { updateCompany } from "@/app/actions/company-actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Pencil } from "lucide-react"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { formatCNPJ } from "@/lib/formatters"

const formSchema = z.object({
    id: z.string(),
    name: z.string().min(3, {
        message: "O nome da empresa deve ter pelo menos 3 caracteres.",
    }),
    cnpj: z.string().min(14, "CNPJ deve conter pelo menos 14 dígitos numéricos")
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => val.length === 14, "CNPJ deve ter 14 dígitos"),
    address: z.string().optional(),
})

interface EditCompanyDialogProps {
    company: {
        id: string;
        name: string;
        cnpj: string;
        address: string | null;
    }
}

export function EditCompanyDialog({ company }: EditCompanyDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: company.id,
            name: company.name,
            cnpj: formatCNPJ(company.cnpj),
            address: company.address || "",
        },
    })

    // Reset when modal opens to ensure fresh state
    useEffect(() => {
        if (open) {
            form.reset({
                id: company.id,
                name: company.name,
                cnpj: formatCNPJ(company.cnpj),
                address: company.address || "",
            })
        }
    }, [open, company, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            const result = await updateCompany(values.id, {
                name: values.name,
                cnpj: values.cnpj,
                address: values.address,
                tradeName: undefined,
                email: undefined,
                phone: undefined,
                city: undefined,
                state: undefined,
                zipCode: undefined,
            })

            if (result?.success) {
                toast({
                    title: "Sucesso!",
                    description: "Empresa atualizada com sucesso",
                })
                setOpen(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao atualizar",
                    description: result?.error || "Erro desconhecido",
                })
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Empresa</DialogTitle>
                    <DialogDescription>
                        Edite os dados da empresa.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Empresa</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cnpj"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CNPJ</FormLabel>
                                    <FormControl>
                                        <Input
                                            maxLength={18}
                                            {...field}
                                            onChange={(e) => {
                                                const formatted = formatCNPJ(e.target.value)
                                                field.onChange(formatted)
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
                                    <FormLabel>Endereço</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

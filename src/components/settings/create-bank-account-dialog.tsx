'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createBankAccount } from "@/app/actions/settings-actions" // Will create this
import { Plus } from "lucide-react"
import { BankCodeInput } from "@/components/ui/bank-code-input"

const formSchema = z.object({
    name: z.string().min(2, "Nome curto demais"),
    bankCode: z.string().optional(),
    bankName: z.string().min(2, "Obrigatório"),
    agency: z.string().min(1, "Obrigatório"),
    accountNumber: z.string().min(1, "Obrigatório"),
    type: z.enum(["CHECKING", "SAVINGS"]).optional(),
})

type FormValues = z.infer<typeof formSchema>

export function CreateBankAccountDialog({ companyId }: { companyId?: string }) {
    const [open, setOpen] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            bankCode: "",
            bankName: "",
            agency: "",
            accountNumber: "",
            type: "CHECKING"
        }
    })

    async function onSubmit(values: FormValues) {
        const res = await createBankAccount({
            ...values,
            companyId
        })

        if (res.success) {
            toast({ title: "Conta adicionada", description: "A conta bancária foi cadastrada com sucesso." })
            setOpen(false)
            form.reset()
        } else {
            toast({ variant: "destructive", title: "Erro", description: res.error })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Adicionar Conta</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nova Conta Bancária</DialogTitle>
                    <DialogDescription>
                        Cadastre contas onde sua empresa recebe pagamentos.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Apelido da Conta (ex: Itaú Principal)</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="bankCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código do Banco</FormLabel>
                                        <FormControl>
                                            <BankCodeInput
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                onBankNameFound={(name) => form.setValue('bankName', name)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="agency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Agência</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="0000" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Banco</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ex: Itaú Unibanco S.A." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="accountNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número da Conta</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="00000-0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Salvar Conta</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

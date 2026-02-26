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
import { useToast } from "@/hooks/use-toast"
import { registerPayment } from "@/app/actions/finance-actions"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    recordId: z.string(),
    amount: z.number().min(0.01, "Valor inválido"),
    date: z.string(),
    bankAccountId: z.string().min(1, "Selecione uma conta bancária"),
})

type FormValues = z.infer<typeof formSchema>

interface PaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    record: {
        id: string
        description: string
        amount: number
        paidAmount: number
        status: string
    } | null
    bankAccounts: { id: string; name: string }[]
}

export function PaymentDialog({ open, onOpenChange, record, bankAccounts }: PaymentDialogProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            recordId: record?.id || "",
            amount: record ? record.amount - record.paidAmount : 0,
            date: new Date().toISOString().split("T")[0],
            bankAccountId: "",
        },
    })

    // Effect to update form values when record changes and dialog opens
    if (record && open && form.getValues("recordId") !== record.id) {
        form.reset({
            recordId: record.id,
            amount: record.amount - record.paidAmount,
            date: new Date().toISOString().split("T")[0],
            bankAccountId: "",
        })
    }

    async function onSubmit(values: FormValues) {
        if (!record) return

        if (values.amount > (record.amount - record.paidAmount)) {
            form.setError("amount", {
                type: "manual",
                message: "O valor pago não pode exceder o saldo devedor."
            })
            return
        }

        setLoading(true)
        try {
            const result = await registerPayment(
                values.recordId,
                values.amount,
                new Date(values.date),
                values.bankAccountId
            )

            if (result.success) {
                toast({
                    title: "Pagamento Registrado",
                    description: `R$ ${values.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} baixado com sucesso.`,
                })
                onOpenChange(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao registrar",
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pagamento</DialogTitle>
                    <DialogDescription>
                        Confirmar o recebimento do título: <b>{record?.description}</b>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor Recebido (R$)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data do Pagamento</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bankAccountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conta de Destino</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a conta" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {bankAccounts.map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Baixa
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

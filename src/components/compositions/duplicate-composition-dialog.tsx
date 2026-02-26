'use client'

import { useState } from "react"
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
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { duplicateCostComposition } from "@/app/actions/cost-composition-actions"
import { Copy, Loader2 } from "lucide-react"

const formSchema = z.object({
    newCode: z.string().min(1, "Novo código é obrigatório"),
})

type FormValues = z.infer<typeof formSchema>

interface DuplicateCompositionDialogProps {
    compositionId: string
    trigger?: React.ReactNode
    onClose?: () => void
}

export function DuplicateCompositionDialog({
    compositionId,
    trigger,
    onClose
}: DuplicateCompositionDialogProps) {
    const [open, setOpen] = useState(trigger ? false : true)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            newCode: "",
        }
    })

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await duplicateCostComposition(compositionId, values.newCode)

            if (result.success) {
                toast({
                    title: "Composição Duplicada",
                    description: `Nova composição ${values.newCode} criada com sucesso.`,
                })
                setOpen(false)
                if (onClose) onClose()
                window.location.reload()
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

    function handleOpenChange(newOpen: boolean) {
        setOpen(newOpen)
        if (!newOpen && onClose) {
            onClose()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Duplicar Composição</DialogTitle>
                    <DialogDescription>
                        Crie uma cópia desta composição incluindo todos os insumos
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="newCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Novo Código *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: ALV-002" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Código único para a nova composição
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="p-4 bg-muted rounded-lg text-sm">
                            <p className="font-semibold mb-2">O que será duplicado:</p>
                            <ul className="space-y-1 text-muted-foreground">
                                <li>✓ Descrição (com sufixo "Cópia")</li>
                                <li>✓ Unidade e BDI</li>
                                <li>✓ Todos os materiais</li>
                                <li>✓ Toda a mão de obra</li>
                                <li>✓ Todos os equipamentos</li>
                            </ul>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {!loading && <Copy className="mr-2 h-4 w-4" />}
                                Duplicar Composição
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

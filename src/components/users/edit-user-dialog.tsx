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
import { updateUser } from "@/app/actions/user-actions"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    id: z.string(),
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres").regex(/^[a-zA-Z0-9._-]+$/, "Apenas letras, números, pontos, hífens e underscores"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    password: z.string().optional(),
    role: z.enum(["ADMIN", "MANAGER", "USER", "ENGINEER"]),
    companyId: z.string().optional(),
})

interface EditUserDialogProps {
    user: {
        id: string;
        name: string | null;
        username: string;
        email: string | null;
        role: "ADMIN" | "MANAGER" | "USER" | "ENGINEER";
        companyId: string | null;
    };
    companies: { id: string; name: string }[];
}

export function EditUserDialog({ user, companies }: EditUserDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: user.id,
            name: user.name || "",
            username: user.username,
            email: user.email || "",
            password: "",
            role: user.role,
            companyId: user.companyId || "none",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                id: user.id,
                name: user.name || "",
                username: user.username,
                email: user.email || "",
                password: "",
                role: user.role,
                companyId: user.companyId || "none",
            })
        }
    }, [open, user, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            const formData = new FormData()
            formData.append("id", values.id)
            formData.append("name", values.name)
            formData.append("username", values.username)
            if (values.email) formData.append("email", values.email)
            if (values.password) formData.append("password", values.password)
            formData.append("role", values.role)
            if (values.companyId && values.companyId !== "none") {
                formData.append("companyId", values.companyId)
            }

            const result = await updateUser({}, formData)

            if (result?.success) {
                toast({
                    title: "Sucesso!",
                    description: result.message,
                })
                setOpen(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao atualizar",
                    description: result?.message || "Erro desconhecido",
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
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>
                        Edite os dados do usuário. Senha opcional.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Usuário</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email (opcional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova Senha (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Deixe em branco para manter" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cargo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um cargo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ADMIN">Administrador</SelectItem>
                                                <SelectItem value="MANAGER">Gerente</SelectItem>
                                                <SelectItem value="USER">Usuário</SelectItem>
                                                <SelectItem value="ENGINEER">Engenheiro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="companyId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Empresa</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione uma empresa" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhuma</SelectItem>
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
                        </div>
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

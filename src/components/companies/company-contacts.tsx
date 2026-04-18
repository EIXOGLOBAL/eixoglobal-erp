'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
    addCompanyContact,
    updateCompanyContact,
    deleteCompanyContact,
} from "@/app/actions/company-actions"
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Loader2,
    Mail,
    Phone,
    Star,
} from "lucide-react"

const contactSchema = z.object({
    type: z.enum(['EMAIL', 'PHONE']),
    value: z.string().min(1, "Obrigatório"),
    department: z.string().optional(),
    responsible: z.string().optional(),
    isPrimary: z.boolean(),
})

type ContactFormValues = z.infer<typeof contactSchema>

interface Contact {
    id: string
    type: string
    value: string
    department: string | null
    responsible: string | null
    isPrimary: boolean
}

interface CompanyContactsProps {
    companyId: string
    contacts: Contact[]
}

function ContactDialog({
    companyId,
    contact,
    open,
    onOpenChange,
}: {
    companyId: string
    contact?: Contact
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            type: (contact?.type as 'EMAIL' | 'PHONE') || 'EMAIL',
            value: contact?.value || '',
            department: contact?.department || '',
            responsible: contact?.responsible || '',
            isPrimary: contact?.isPrimary || false,
        },
    })

    // Reset when contact changes
    useEffect(() => {
        form.reset({
            type: (contact?.type as 'EMAIL' | 'PHONE') || 'EMAIL',
            value: contact?.value || '',
            department: contact?.department || '',
            responsible: contact?.responsible || '',
            isPrimary: contact?.isPrimary ?? false,
        })
    }, [contact, form])

    async function onSubmit(values: ContactFormValues) {
        setLoading(true)
        try {
            const result = contact
                ? await updateCompanyContact(contact.id, companyId, values)
                : await addCompanyContact(companyId, values)

            if (result.success) {
                toast({
                    title: contact ? 'Contato atualizado' : 'Contato adicionado',
                    description: `${values.value} salvo com sucesso.`,
                })
                onOpenChange(false)
                window.location.reload()
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } catch {
            toast({ variant: 'destructive', title: 'Erro inesperado' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{contact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="EMAIL">E-mail</SelectItem>
                                                <SelectItem value="PHONE">Telefone</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {form.watch('type') === 'EMAIL' ? 'E-mail *' : 'Telefone *'}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={form.watch('type') === 'EMAIL'
                                                    ? 'contato@empresa.com'
                                                    : '(00) 00000-0000'}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamento</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Financeiro" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="responsible"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Responsável</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome do responsável" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="isPrimary"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div>
                                        <FormLabel className="cursor-pointer">Contato Principal</FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                            Marcar como contato primário deste tipo
                                        </p>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {contact ? 'Atualizar' : 'Adicionar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function CompanyContacts({ companyId, contacts }: CompanyContactsProps) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editContact, setEditContact] = useState<Contact | undefined>()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const { toast } = useToast()

    const emails = contacts.filter(c => c.type === 'EMAIL')
    const phones = contacts.filter(c => c.type === 'PHONE')

    function openCreate() {
        setEditContact(undefined)
        setDialogOpen(true)
    }

    function openEdit(c: Contact) {
        setEditContact(c)
        setDialogOpen(true)
    }

    async function handleDelete(contactId: string) {
        setDeletingId(contactId)
        try {
            const result = await deleteCompanyContact(contactId, companyId)
            if (result.success) {
                toast({ title: 'Contato removido' })
                window.location.reload()
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } catch {
            toast({ variant: 'destructive', title: 'Erro inesperado' })
        } finally {
            setDeletingId(null)
        }
    }

    function ContactRow({ c }: { c: Contact }) {
        const isDeleting = deletingId === c.id
        return (
            <TableRow>
                <TableCell>
                    <div className="flex items-center gap-2">
                        {c.type === 'EMAIL'
                            ? <Mail className="h-4 w-4 text-blue-500" />
                            : <Phone className="h-4 w-4 text-green-500" />
                        }
                        <span className="font-medium">{c.value}</span>
                        {c.isPrimary && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                    </div>
                </TableCell>
                <TableCell>
                    {c.department
                        ? <Badge variant="outline">{c.department}</Badge>
                        : <span className="text-muted-foreground text-sm">—</span>
                    }
                </TableCell>
                <TableCell className="text-sm">
                    {c.responsible || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                    {c.isPrimary && <Badge className="text-xs">Principal</Badge>}
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isDeleting} aria-label="Excluir contato">
                                {isDeleting
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <MoreHorizontal className="h-4 w-4" />
                                }
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(c.id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {contacts.length} contato{contacts.length !== 1 ? 's' : ''} cadastrado{contacts.length !== 1 ? 's' : ''}
                </p>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Contato
                </Button>
            </div>

            {/* Emails */}
            {emails.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        E-mails ({emails.length})
                    </h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Endereço</TableHead>
                                <TableHead>Departamento</TableHead>
                                <TableHead>Responsável</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {emails.map(c => <ContactRow key={c.id} c={c} />)}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Phones */}
            {phones.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-500" />
                        Telefones ({phones.length})
                    </h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Departamento</TableHead>
                                <TableHead>Responsável</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {phones.map(c => <ContactRow key={c.id} c={c} />)}
                        </TableBody>
                    </Table>
                </div>
            )}

            {contacts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Nenhum contato cadastrado.</p>
                    <p className="text-xs mt-1">Clique em "Adicionar Contato" para começar.</p>
                </div>
            )}

            <ContactDialog
                companyId={companyId}
                contact={editContact}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    )
}

'use client'

import { useState } from "react"
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
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Building2, User, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { changeContractorStatus } from "@/app/actions/contractor-actions"
import { ContractorDialog } from "./contractor-dialog"

interface Contractor {
    id: string
    code: string | null
    name: string
    document: string | null
    type: 'COMPANY' | 'INDIVIDUAL'
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
    _count: { contracts: number }
}

interface ContractorsTableProps {
    data: Contractor[]
    companyId: string
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-orange-100 text-orange-800',
    BLOCKED: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    BLOCKED: 'Bloqueado',
}

export function ContractorsTable({ data, companyId }: ContractorsTableProps) {
    const { toast } = useToast()
    const [editingContractor, setEditingContractor] = useState<Contractor | null>(null)

    async function handleChangeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED', name: string) {
        const result = await changeContractorStatus(id, status)
        if (result.success) {
            toast({ title: "Status Alterado", description: `${name} → ${STATUS_LABELS[status]}` })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma empreiteira cadastrada</p>
                <p className="text-sm mt-1">Cadastre empreiteiras e subcontratadas para vinculá-las aos contratos.</p>
            </div>
        )
    }

    return (
        <>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead>Nome / Razão Social</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CNPJ / CPF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contratos</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((contractor) => (
                    <TableRow key={contractor.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                            {contractor.code || '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                {contractor.type === 'COMPANY'
                                    ? <Building2 className="h-4 w-4 text-muted-foreground" />
                                    : <User className="h-4 w-4 text-muted-foreground" />
                                }
                                {contractor.name}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline">
                                {contractor.type === 'COMPANY' ? 'PJ' : 'PF'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                            {contractor.document || '—'}
                        </TableCell>
                        <TableCell>
                            <Badge className={STATUS_COLORS[contractor.status] ?? ''}>
                                {STATUS_LABELS[contractor.status] ?? contractor.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={contractor._count.contracts > 0 ? 'secondary' : 'outline'}>
                                {contractor._count.contracts} contrato{contractor._count.contracts !== 1 ? 's' : ''}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Abrir menu de ações">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setEditingContractor(contractor)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onSelect={() => handleChangeStatus(contractor.id, 'ACTIVE', contractor.name)}>
                                                Ativo
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleChangeStatus(contractor.id, 'INACTIVE', contractor.name)}>
                                                Inativo
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleChangeStatus(contractor.id, 'BLOCKED', contractor.name)}>
                                                Bloqueado
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

        {editingContractor && (
            <ContractorDialog
                companyId={companyId}
                contractor={editingContractor}
                open={!!editingContractor}
                onOpenChange={(open) => { if (!open) setEditingContractor(null) }}
            />
        )}
        </>
    )
}

'use client'

import { useState } from "react"
import Link from "next/link"
import { CompanyDialog } from "./company-dialog"
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MoreHorizontal, Eye, Edit, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CompaniesTableProps {
    data: any[]
}

export function CompaniesTable({ data }: CompaniesTableProps) {
    const [editingCompany, setEditingCompany] = useState<any>(null)
    const { toast } = useToast()

    if (!data || data.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Comece cadastrando sua primeira empresa cliente.
                </p>
                <CompanyDialog />
            </Card>
        )
    }

    return (
        <>
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Código</TableHead>
                            <TableHead>Razão Social</TableHead>
                            <TableHead>CNPJ</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Cidade/UF</TableHead>
                            <TableHead>Projetos</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((company) => (
                            <TableRow key={company.id}>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                    {company.code || '—'}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/companies/${company.id}`}
                                        className="hover:underline"
                                    >
                                        {company.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                    {company.cnpj}
                                </TableCell>
                                <TableCell>{company.email || '-'}</TableCell>
                                <TableCell>{company.phone || '-'}</TableCell>
                                <TableCell>
                                    {company.city && company.state
                                        ? `${company.city}/${company.state}`
                                        : company.city || company.state || '-'
                                    }
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                        {company._count?.projects || 0}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href={`/companies/${company.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver Detalhes
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setEditingCompany(company)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {editingCompany && (
                <CompanyDialog
                    company={editingCompany}
                    open={!!editingCompany}
                    onOpenChange={(open) => { if (!open) setEditingCompany(null) }}
                />
            )}
        </>
    )
}

'use client'

import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, ArrowRight } from "lucide-react"
import { formatDate } from "@/lib/formatters"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"

const budgetExportColumns: ExportColumn[] = [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descricao' },
    { key: 'projectName', label: 'Projeto' },
    { key: 'totalValueFmt', label: 'Valor Total', format: (v) => String(v ?? '') },
    { key: 'statusPtBr', label: 'Status' },
    { key: 'createdAt', label: 'Data' },
]

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Em Elaboração",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    REVISED: "Revisado",
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-orange-100 text-orange-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    REVISED: "bg-blue-100 text-blue-800",
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    }).format(value)

interface Project {
    id: string
    name: string
}

interface Budget {
    id: string
    code: string | null
    name: string
    description: string | null
    projectId: string
    status: string
    totalValue: number
    createdAt: Date
    project: { id: string; name: string }
    _count: { items: number }
}

interface OrcamentosClientProps {
    budgets: Budget[]
    projects: Project[]
    companyId: string
}

export function OrcamentosClient({ budgets }: OrcamentosClientProps) {
    return (
        <>
            {budgets.length > 0 && (
                <div className="flex justify-end mb-4">
                    <ExportButton
                        data={budgets.map(b => ({
                            ...b,
                            code: b.code || '',
                            description: b.description || '',
                            projectName: b.project.name,
                            totalValueFmt: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(b.totalValue),
                            statusPtBr: STATUS_LABELS[b.status] ?? b.status,
                        }))}
                        columns={budgetExportColumns}
                        filename="orcamentos"
                        title="Orcamentos"
                        sheetName="Orcamentos"
                        size="sm"
                    />
                </div>
            )}
            {budgets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhum orçamento cadastrado</p>
                    <p className="text-sm mt-1">Crie um orçamento para começar.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {budgets.map((budget) => (
                            <TableRow key={budget.id}>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                    {budget.code || "—"}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div>
                                        <p>{budget.name}</p>
                                        {budget.description && (
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {budget.description}
                                            </p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {budget.project.name}
                                </TableCell>
                                <TableCell className="text-right tabular-nums font-medium">
                                    {formatBRL(budget.totalValue)}
                                </TableCell>
                                <TableCell>
                                    <Badge className={STATUS_COLORS[budget.status] ?? ""}>
                                        {STATUS_LABELS[budget.status] ?? budget.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(budget.createdAt)}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/orcamentos/${budget.id}`}>
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

        </>
    )
}

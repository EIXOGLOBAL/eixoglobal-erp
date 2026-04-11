'use client'

import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"
import { formatCurrency } from "@/lib/export-utils"

const salaryExportColumns: ExportColumn[] = [
    { key: 'tableName', label: 'Tabela' },
    { key: 'tableStatus', label: 'Status Tabela' },
    { key: 'jobTitle', label: 'Cargo' },
    { key: 'level', label: 'Nível', format: (v) => v ? String(v) : '' },
    { key: 'baseSalary', label: 'Salário Base', format: (v) => formatCurrency(v as number) },
    { key: 'benefits', label: 'Benefícios', format: (v) => formatCurrency(v as number) },
    { key: 'taxRate', label: 'Encargos %', format: (v) => `${Number(v).toFixed(1)}%` },
    { key: 'costPerHour', label: 'Custo/Hora', format: (v) => formatCurrency(v as number) },
]

interface SalaryGrade {
    jobTitle: string
    level: string | null
    baseSalary: number
    benefits: number
    taxRate: number
    costPerHour: number
}

interface SalaryTable {
    name: string
    isActive: boolean
    grades: SalaryGrade[]
}

interface SalaryTableExportButtonProps {
    tables: SalaryTable[]
}

export function SalaryTableExportButton({ tables }: SalaryTableExportButtonProps) {
    const data: Record<string, unknown>[] = tables.flatMap(t =>
        t.grades.map(g => ({
            tableName: t.name,
            tableStatus: t.isActive ? 'Ativo' : 'Inativo',
            jobTitle: g.jobTitle,
            level: g.level,
            baseSalary: Number(g.baseSalary),
            benefits: Number(g.benefits),
            taxRate: Number(g.taxRate),
            costPerHour: Number(g.costPerHour),
        }))
    )

    return (
        <ExportButton
            data={data}
            columns={salaryExportColumns}
            filename="tabela_salarial"
            title="Tabela Salarial"
            sheetName="Tabela Salarial"
            size="sm"
        />
    )
}

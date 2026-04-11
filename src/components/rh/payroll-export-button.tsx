'use client'

import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"
import { formatCurrency } from "@/lib/export-utils"

const payrollExportColumns: ExportColumn[] = [
    { key: 'name', label: 'Nome' },
    { key: 'jobTitle', label: 'Cargo' },
    { key: 'salarioBruto', label: 'Salário Base', format: (v) => formatCurrency(v as number) },
    { key: 'horasTrabalhadas', label: 'Horas Trab.' },
    { key: 'inss', label: 'INSS', format: (v) => formatCurrency(v as number) },
    { key: 'irrf', label: 'IRRF', format: (v) => formatCurrency(v as number) },
    { key: 'fgts', label: 'FGTS (emp.)', format: (v) => formatCurrency(v as number) },
    { key: 'vt', label: 'Vale Transporte', format: (v) => formatCurrency(v as number) },
    { key: 'salarioLiquido', label: 'Salário Líquido', format: (v) => formatCurrency(v as number) },
    { key: '_situacao', label: 'Situação' },
]

interface PayrollRow {
    name: string
    jobTitle: string
    salarioBruto: number
    horasTrabalhadas: number
    inss: number
    irrf: number
    fgts: number
    vt: number
    salarioLiquido: number
    hasRate: boolean
}

interface PayrollExportButtonProps {
    rows?: PayrollRow[]
    competencia?: string
}

export function PayrollExportButton({ rows = [], competencia = '' }: PayrollExportButtonProps) {
    const data = rows.map(r => ({
        ...r,
        _situacao: r.hasRate ? 'Calculado' : 'Pendente',
    }))

    return (
        <ExportButton
            data={data}
            columns={payrollExportColumns}
            filename="folha_pagamento"
            title={`Folha de Pagamento${competencia ? ` - ${competencia}` : ''}`}
            sheetName="Folha de Pagamento"
            size="sm"
        />
    )
}

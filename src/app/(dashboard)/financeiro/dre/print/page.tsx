import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { generateDRE } from "@/lib/financial-reports"
import { prisma } from "@/lib/prisma"
import { PrintButton } from "@/components/rdo/print-button"
import type { DRELine } from "@/lib/financial-reports"

export const dynamic = 'force-dynamic'

const MONTHS: Record<number, string> = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}

function fmt(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtPct(v: number): string {
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function getPrefix(line: DRELine): string {
    if (line.isResult) return '(=)'
    if (line.type === 'revenue') return line.level === 0 ? '(+)' : ''
    if (['deduction', 'cost', 'expense', 'tax'].includes(line.type)) return line.level <= 1 ? '(-)' : ''
    return ''
}

interface SearchParams {
    year?: string
    month?: string
}

export default async function DREPrintPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const params = await searchParams
    const now = new Date()
    const year = params.year ? parseInt(params.year, 10) : now.getFullYear()
    const month = params.month && params.month !== 'all'
        ? parseInt(params.month, 10)
        : now.getMonth() + 1

    const [report, company] = await Promise.all([
        generateDRE(companyId, year, month),
        prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, tradeName: true, cnpj: true, logoUrl: true },
        }),
    ])

    if (!report) notFound()

    const periodLabel = month
        ? `${MONTHS[month]} / ${year}`
        : `Ano ${year}`

    const generatedAt = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

    return (
        <html lang="pt-BR">
            <head>
                <meta charSet="UTF-8" />
                <title>DRE - {periodLabel} - {company?.tradeName || company?.name || 'Empresa'}</title>
                <style>{`
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11px;
                        color: #1a1a1a;
                        background: white;
                        padding: 15mm;
                    }
                    @page { size: A4; margin: 15mm; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none !important; }
                    }

                    /* Header */
                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2px solid #1a1a1a;
                        padding-bottom: 12px;
                        margin-bottom: 16px;
                    }
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .header-logo {
                        width: 60px;
                        height: 60px;
                        object-fit: contain;
                    }
                    .header-company {
                        font-size: 14px;
                        font-weight: bold;
                    }
                    .header-cnpj {
                        font-size: 10px;
                        color: #555;
                    }
                    .header-right {
                        text-align: right;
                    }
                    .header-title {
                        font-size: 16px;
                        font-weight: bold;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                    }
                    .header-period {
                        font-size: 12px;
                        color: #333;
                        margin-top: 2px;
                    }
                    .header-date {
                        font-size: 9px;
                        color: #888;
                        margin-top: 4px;
                    }

                    /* Summary Cards */
                    .summary-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr 1fr;
                        gap: 8px;
                        margin-bottom: 16px;
                    }
                    .summary-card {
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 8px 10px;
                        background: #f9f9f9;
                    }
                    .summary-card label {
                        font-size: 9px;
                        font-weight: bold;
                        text-transform: uppercase;
                        color: #666;
                        display: block;
                    }
                    .summary-card .value {
                        font-size: 14px;
                        font-weight: bold;
                        margin-top: 2px;
                    }
                    .summary-card .value.positive { color: #16a34a; }
                    .summary-card .value.negative { color: #dc2626; }

                    /* Table */
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 16px;
                    }
                    th {
                        background: #f0f0f0;
                        font-weight: bold;
                        font-size: 10px;
                        text-align: left;
                        padding: 6px 8px;
                        border: 1px solid #ccc;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    th.right { text-align: right; }
                    td {
                        padding: 5px 8px;
                        border: 1px solid #ddd;
                        font-size: 10px;
                    }
                    td.right { text-align: right; font-variant-numeric: tabular-nums; }
                    td.prefix { width: 30px; font-family: monospace; font-size: 9px; text-align: center; }

                    /* Row styles */
                    .row-result {
                        background: #e8e8e8;
                        font-weight: bold;
                    }
                    .row-highlight {
                        background: #1e293b;
                        color: white;
                        font-weight: bold;
                    }
                    .row-highlight td { border-color: #334155; }
                    .row-group {
                        background: #f5f5f5;
                        font-weight: 600;
                    }
                    .row-sub {
                        color: #555;
                    }
                    .text-red { color: #dc2626; }
                    .text-green { color: #16a34a; }
                    .row-highlight .text-red, .row-highlight .text-green { color: inherit; }

                    /* Footer */
                    .footer {
                        margin-top: 24px;
                        padding-top: 8px;
                        border-top: 1px solid #ddd;
                        font-size: 9px;
                        color: #999;
                        display: flex;
                        justify-content: space-between;
                    }

                    /* Print button */
                    .no-print-btn {
                        position: fixed;
                        top: 16px;
                        right: 16px;
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                    }
                    .no-print-btn:hover { background: #1d4ed8; }
                    @media print { .no-print-btn { display: none; } }
                `}</style>
            </head>
            <body>
                <PrintButton />

                {/* Header */}
                <div className="header">
                    <div className="header-left">
                        {company?.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={company.logoUrl} alt="Logo" className="header-logo" />
                        )}
                        <div>
                            <div className="header-company">
                                {company?.tradeName || company?.name || 'Empresa'}
                            </div>
                            {company?.cnpj && (
                                <div className="header-cnpj">CNPJ: {company.cnpj}</div>
                            )}
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="header-title">DRE</div>
                        <div className="header-period">
                            Demonstrativo de Resultado - {periodLabel}
                        </div>
                        <div className="header-date">
                            Gerado em: {generatedAt}
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="summary-grid">
                    <div className="summary-card">
                        <label>EBITDA</label>
                        <div className={`value ${report.summary.ebitda >= 0 ? 'positive' : 'negative'}`}>
                            {fmt(report.summary.ebitda)}
                        </div>
                    </div>
                    <div className="summary-card">
                        <label>Margem EBITDA</label>
                        <div className={`value ${report.summary.ebitdaMargin >= 0 ? 'positive' : 'negative'}`}>
                            {report.summary.ebitdaMargin.toFixed(1)}%
                        </div>
                    </div>
                    <div className="summary-card">
                        <label>Lucro Líquido</label>
                        <div className={`value ${report.summary.netProfit >= 0 ? 'positive' : 'negative'}`}>
                            {fmt(report.summary.netProfit)}
                        </div>
                    </div>
                    <div className="summary-card">
                        <label>Margem Líquida</label>
                        <div className={`value ${report.summary.netMargin >= 0 ? 'positive' : 'negative'}`}>
                            {report.summary.netMargin.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* DRE Table */}
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}></th>
                            <th>Descrição</th>
                            <th className="right">Período Atual</th>
                            <th className="right">Período Anterior</th>
                            <th className="right">Var %</th>
                            <th className="right">Acum. Ano</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.lines.map(line => {
                            const isHighlight = line.isResult && (line.id === 'ebitda' || line.id === 'lucro-liquido')
                            const isResult = line.isResult && !isHighlight
                            const isGroup = !line.isResult && line.level === 0
                            const isSub = !line.isResult && line.level >= 1

                            const rowClass = isHighlight
                                ? 'row-highlight'
                                : isResult
                                    ? 'row-result'
                                    : isGroup
                                        ? 'row-group'
                                        : isSub
                                            ? 'row-sub'
                                            : ''

                            const prefix = getPrefix(line)

                            return (
                                <tr key={line.id} className={rowClass}>
                                    <td className="prefix">{prefix}</td>
                                    <td style={{ paddingLeft: line.level >= 1 ? '24px' : '8px' }}>
                                        {line.label}
                                    </td>
                                    <td className={`right ${line.currentValue < 0 && !isHighlight ? 'text-red' : ''}`}>
                                        {line.currentValue === 0 ? '—' : fmt(Math.abs(line.currentValue))}
                                    </td>
                                    <td className={`right ${line.previousValue < 0 && !isHighlight ? 'text-red' : ''}`}>
                                        {line.previousValue === 0 ? '—' : fmt(Math.abs(line.previousValue))}
                                    </td>
                                    <td className={`right ${!isHighlight && line.variationPercent > 0 ? 'text-green' : ''} ${!isHighlight && line.variationPercent < 0 ? 'text-red' : ''}`}>
                                        {line.variationPercent === 0 ? '—' : fmtPct(line.variationPercent)}
                                    </td>
                                    <td className={`right ${line.yearToDate < 0 && !isHighlight ? 'text-red' : ''}`}>
                                        {line.yearToDate === 0 ? '—' : fmt(Math.abs(line.yearToDate))}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {/* Legend */}
                <div style={{ fontSize: '9px', color: '#888', marginBottom: '8px' }}>
                    <strong>Legenda:</strong> (+) Receitas | (-) Deduções / Custos / Despesas | (=) Resultado |
                    Valores negativos em <span className="text-red">vermelho</span> |
                    Estimativas aplicadas: Deduções 10%, Depreciação 2%, IR 15%
                </div>

                {/* Footer */}
                <div className="footer">
                    <span>
                        {company?.tradeName || company?.name || 'Empresa'} - DRE {periodLabel}
                    </span>
                    <span>Gerado em {generatedAt}</span>
                </div>
            </body>
        </html>
    )
}

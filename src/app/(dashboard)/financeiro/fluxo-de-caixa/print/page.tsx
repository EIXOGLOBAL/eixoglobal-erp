import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { generateCashflowProjection, getFinancialKPIs } from "@/lib/financial-reports"
import { prisma } from "@/lib/prisma"
import { PrintButton } from "@/components/rdo/print-button"

export const dynamic = 'force-dynamic'

function fmt(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

interface SearchParams {
    months?: string
}

export default async function FluxoCaixaPrintPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const params = await searchParams
    const months = params.months ? parseInt(params.months, 10) : 6

    const [projection, kpis, company, financialRecords] = await Promise.all([
        generateCashflowProjection(companyId, months),
        getFinancialKPIs(companyId),
        prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, tradeName: true, cnpj: true, logoUrl: true },
        }),
        // Buscar registros financeiros agrupados por categoria para seções Operacional/Investimentos/Financiamentos
        prisma.financialRecord.findMany({
            where: {
                companyId,
                status: { not: 'CANCELLED' },
                dueDate: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
                },
            },
            include: { costCenter: true },
            orderBy: { dueDate: 'asc' },
        }),
    ])

    if (!projection) notFound()

    const generatedAt = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

    // Classificar registros por seção
    const FINANCIAL_KEYWORDS = ['juros', 'financeiro', 'multa', 'tarifa bancária', 'iof', 'taxa bancária', 'empréstimo', 'financiamento']
    const INVESTMENT_KEYWORDS = ['investimento', 'aquisição', 'equipamento', 'ativo', 'imobilizado', 'veículo']

    function classify(category: string | null, description: string): 'operational' | 'investment' | 'financing' {
        const text = `${category || ''} ${description}`.toLowerCase()
        if (FINANCIAL_KEYWORDS.some(k => text.includes(k))) return 'financing'
        if (INVESTMENT_KEYWORDS.some(k => text.includes(k))) return 'investment'
        return 'operational'
    }

    const sections = {
        operational: { income: 0, expense: 0, items: [] as { desc: string; value: number; type: string }[] },
        investment: { income: 0, expense: 0, items: [] as { desc: string; value: number; type: string }[] },
        financing: { income: 0, expense: 0, items: [] as { desc: string; value: number; type: string }[] },
    }

    for (const rec of financialRecords) {
        const section = classify(rec.category, rec.description)
        const amount = Number(rec.amount)
        if (rec.type === 'INCOME') {
            sections[section].income += amount
        } else {
            sections[section].expense += amount
        }
        sections[section].items.push({
            desc: rec.description,
            value: rec.type === 'INCOME' ? amount : -amount,
            type: rec.type,
        })
    }

    const operationalNet = sections.operational.income - sections.operational.expense
    const investmentNet = sections.investment.income - sections.investment.expense
    const financingNet = sections.financing.income - sections.financing.expense
    const totalNet = operationalNet + investmentNet + financingNet

    const periodLabel = `Projeção ${months} meses`

    return (
        <html lang="pt-BR">
            <head>
                <meta charSet="UTF-8" />
                <title>Fluxo de Caixa - {company?.tradeName || company?.name || 'Empresa'}</title>
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
                        .page-break { page-break-before: always; }
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

                    /* KPI row */
                    .kpi-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr 1fr;
                        gap: 8px;
                        margin-bottom: 16px;
                    }
                    .kpi-card {
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 8px 10px;
                        background: #f9f9f9;
                    }
                    .kpi-card label {
                        font-size: 9px;
                        font-weight: bold;
                        text-transform: uppercase;
                        color: #666;
                        display: block;
                    }
                    .kpi-card .value {
                        font-size: 14px;
                        font-weight: bold;
                        margin-top: 2px;
                    }
                    .positive { color: #16a34a; }
                    .negative { color: #dc2626; }

                    /* Section */
                    .section {
                        margin-bottom: 16px;
                    }
                    .section-title {
                        font-size: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        border-bottom: 1px solid #1a1a1a;
                        padding-bottom: 4px;
                        margin-bottom: 8px;
                    }
                    .section-subtitle {
                        font-size: 10px;
                        color: #666;
                        margin-bottom: 4px;
                    }

                    /* Table */
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 12px;
                    }
                    th {
                        background: #f0f0f0;
                        font-weight: bold;
                        font-size: 10px;
                        text-align: left;
                        padding: 6px 8px;
                        border: 1px solid #ccc;
                    }
                    th.right { text-align: right; }
                    td {
                        padding: 5px 8px;
                        border: 1px solid #ddd;
                        font-size: 10px;
                    }
                    td.right {
                        text-align: right;
                        font-variant-numeric: tabular-nums;
                    }
                    tr:nth-child(even) td { background: #fafafa; }
                    .total-row td {
                        font-weight: bold;
                        background: #e8e8e8 !important;
                    }
                    .grand-total td {
                        font-weight: bold;
                        background: #1e293b !important;
                        color: white;
                        border-color: #334155;
                    }

                    /* Confidence badge */
                    .badge {
                        display: inline-block;
                        padding: 1px 6px;
                        border-radius: 3px;
                        font-size: 9px;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .badge-high { background: #dcfce7; color: #166534; }
                    .badge-medium { background: #fef9c3; color: #854d0e; }
                    .badge-low { background: #fee2e2; color: #991b1b; }

                    /* Alerts */
                    .alert {
                        border: 1px solid #fca5a5;
                        background: #fef2f2;
                        border-radius: 4px;
                        padding: 8px 10px;
                        margin-bottom: 6px;
                        font-size: 10px;
                        color: #991b1b;
                    }
                    .alert-medium {
                        border-color: #fcd34d;
                        background: #fffbeb;
                        color: #854d0e;
                    }

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
                        <div className="header-title">Fluxo de Caixa</div>
                        <div className="header-period">{periodLabel}</div>
                        <div className="header-date">Gerado em: {generatedAt}</div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <label>Saldo Atual</label>
                        <div className={`value ${projection.currentBalance >= 0 ? 'positive' : 'negative'}`}>
                            {fmt(projection.currentBalance)}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <label>Burn Rate Mensal</label>
                        <div className="value negative">
                            {fmt(kpis.burnRate)}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <label>Runway</label>
                        <div className={`value ${kpis.cashRunway >= 6 ? 'positive' : 'negative'}`}>
                            {kpis.cashRunway >= 999 ? '> 12 meses' : `${kpis.cashRunway.toFixed(1)} meses`}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <label>Saldo Líquido Mês</label>
                        <div className={`value ${totalNet >= 0 ? 'positive' : 'negative'}`}>
                            {fmt(totalNet)}
                        </div>
                    </div>
                </div>

                {/* Seção: Fluxo do Mês Atual por Tipo */}
                <div className="section">
                    <div className="section-title">Fluxo do Mês Atual</div>

                    {/* Operacional */}
                    <div className="section-subtitle">Atividades Operacionais</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th className="right" style={{ width: '150px' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sections.operational.items.length === 0 ? (
                                <tr>
                                    <td colSpan={2} style={{ textAlign: 'center', color: '#888' }}>
                                        Nenhum registro operacional no mês
                                    </td>
                                </tr>
                            ) : (
                                sections.operational.items.slice(0, 15).map((item, idx) => (
                                    <tr key={`op-${idx}`}>
                                        <td>{item.desc}</td>
                                        <td className={`right ${item.value < 0 ? 'negative' : 'positive'}`}>
                                            {fmt(item.value)}
                                        </td>
                                    </tr>
                                ))
                            )}
                            <tr className="total-row">
                                <td>Subtotal Operacional</td>
                                <td className={`right ${operationalNet >= 0 ? 'positive' : 'negative'}`}>
                                    {fmt(operationalNet)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Investimentos */}
                    <div className="section-subtitle">Atividades de Investimento</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th className="right" style={{ width: '150px' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sections.investment.items.length === 0 ? (
                                <tr>
                                    <td colSpan={2} style={{ textAlign: 'center', color: '#888' }}>
                                        Nenhum registro de investimento no mês
                                    </td>
                                </tr>
                            ) : (
                                sections.investment.items.slice(0, 10).map((item, idx) => (
                                    <tr key={`inv-${idx}`}>
                                        <td>{item.desc}</td>
                                        <td className={`right ${item.value < 0 ? 'negative' : 'positive'}`}>
                                            {fmt(item.value)}
                                        </td>
                                    </tr>
                                ))
                            )}
                            <tr className="total-row">
                                <td>Subtotal Investimentos</td>
                                <td className={`right ${investmentNet >= 0 ? 'positive' : 'negative'}`}>
                                    {fmt(investmentNet)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Financiamentos */}
                    <div className="section-subtitle">Atividades de Financiamento</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th className="right" style={{ width: '150px' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sections.financing.items.length === 0 ? (
                                <tr>
                                    <td colSpan={2} style={{ textAlign: 'center', color: '#888' }}>
                                        Nenhum registro de financiamento no mês
                                    </td>
                                </tr>
                            ) : (
                                sections.financing.items.slice(0, 10).map((item, idx) => (
                                    <tr key={`fin-${idx}`}>
                                        <td>{item.desc}</td>
                                        <td className={`right ${item.value < 0 ? 'negative' : 'positive'}`}>
                                            {fmt(item.value)}
                                        </td>
                                    </tr>
                                ))
                            )}
                            <tr className="total-row">
                                <td>Subtotal Financiamentos</td>
                                <td className={`right ${financingNet >= 0 ? 'positive' : 'negative'}`}>
                                    {fmt(financingNet)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Grand Total */}
                    <table>
                        <tbody>
                            <tr className="grand-total">
                                <td>VARIAÇÃO LÍQUIDA DO CAIXA NO MÊS</td>
                                <td className="right" style={{ width: '150px' }}>
                                    {fmt(totalNet)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Seção: Projeção dos Próximos Meses */}
                <div className="section">
                    <div className="section-title">Projeção - Próximos {months} Meses</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Mês</th>
                                <th className="right">Entradas</th>
                                <th className="right">Saídas</th>
                                <th className="right">Saldo Mês</th>
                                <th className="right">Saldo Acumulado</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Confiança</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projection.months.map(pm => (
                                <tr key={pm.month}>
                                    <td>{pm.label}</td>
                                    <td className="right positive">{fmt(pm.projectedInflow)}</td>
                                    <td className="right negative">{fmt(pm.projectedOutflow)}</td>
                                    <td className={`right ${pm.projectedBalance >= 0 ? 'positive' : 'negative'}`}>
                                        {fmt(pm.projectedBalance)}
                                    </td>
                                    <td className={`right ${pm.cumulativeBalance >= 0 ? 'positive' : 'negative'}`}>
                                        {fmt(pm.cumulativeBalance)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge badge-${pm.confidence}`}>
                                            {pm.confidence === 'high' ? 'Alta' : pm.confidence === 'medium' ? 'Média' : 'Baixa'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Alertas */}
                {projection.alerts.length > 0 && (
                    <div className="section">
                        <div className="section-title">Alertas</div>
                        {projection.alerts.map((alert, idx) => (
                            <div
                                key={idx}
                                className={`alert ${alert.severity === 'medium' ? 'alert-medium' : ''}`}
                            >
                                {alert.message}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="footer">
                    <span>
                        {company?.tradeName || company?.name || 'Empresa'} - Fluxo de Caixa
                    </span>
                    <span>Gerado em {generatedAt}</span>
                </div>
            </body>
        </html>
    )
}

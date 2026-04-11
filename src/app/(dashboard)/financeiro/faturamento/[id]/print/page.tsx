import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PrintButton } from "@/components/rdo/print-button"

export const dynamic = 'force-dynamic'

function fmt(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: Date | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR')
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Rascunho',
    ISSUED: 'Emitido',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado',
}

export default async function FaturamentoPrintPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const billing = await prisma.billing.findUnique({
        where: { id },
        include: {
            project: true,
            contract: true,
            client: true,
            measurementBulletin: true,
            createdBy: { select: { name: true } },
        },
    })

    if (!billing || billing.companyId !== companyId) notFound()

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
            name: true,
            tradeName: true,
            cnpj: true,
            logoUrl: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true,
        },
    })

    if (!company) notFound()
    const value = Number(billing.value)
    const paidAmount = billing.paidAmount ? Number(billing.paidAmount) : null

    const generatedAt = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

    // Dados do item (pré-nota fiscal simplificada)
    const items: { description: string; quantity: number; unitPrice: number; total: number }[] = []

    if (billing.measurementBulletin) {
        items.push({
            description: `Medição #${billing.measurementBulletin.number} - Ref.: ${billing.measurementBulletin.referenceMonth}`,
            quantity: 1,
            unitPrice: Number(billing.measurementBulletin.totalValue),
            total: Number(billing.measurementBulletin.totalValue),
        })
    } else {
        items.push({
            description: billing.description || 'Serviços prestados',
            quantity: 1,
            unitPrice: value,
            total: value,
        })
    }

    return (
        <html lang="pt-BR">
            <head>
                <meta charSet="UTF-8" />
                <title>Faturamento {billing.number} - {company.tradeName || company.name}</title>
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

                    /* Header / Empresa */
                    .doc-header {
                        border: 2px solid #1a1a1a;
                        padding: 16px;
                        margin-bottom: 16px;
                    }
                    .doc-header-top {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid #ddd;
                    }
                    .doc-header-left {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .doc-logo {
                        width: 70px;
                        height: 70px;
                        object-fit: contain;
                    }
                    .company-name {
                        font-size: 16px;
                        font-weight: bold;
                    }
                    .company-detail {
                        font-size: 10px;
                        color: #555;
                        margin-top: 1px;
                    }
                    .doc-number-box {
                        text-align: right;
                    }
                    .doc-type {
                        font-size: 14px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        color: #1a1a1a;
                    }
                    .doc-number {
                        font-size: 18px;
                        font-weight: bold;
                        color: #2563eb;
                        margin-top: 4px;
                    }
                    .doc-status {
                        display: inline-block;
                        margin-top: 4px;
                        padding: 2px 10px;
                        border-radius: 3px;
                        font-size: 10px;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .status-DRAFT { background: #f3f4f6; color: #6b7280; }
                    .status-ISSUED { background: #dbeafe; color: #1e40af; }
                    .status-PAID { background: #dcfce7; color: #166534; }
                    .status-OVERDUE { background: #fee2e2; color: #991b1b; }
                    .status-CANCELLED { background: #f3f4f6; color: #6b7280; text-decoration: line-through; }

                    /* Info grid */
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                        margin-bottom: 16px;
                    }
                    .info-box {
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 12px;
                    }
                    .info-box-title {
                        font-size: 10px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #666;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 4px;
                        margin-bottom: 8px;
                    }
                    .info-row {
                        display: flex;
                        margin-bottom: 3px;
                    }
                    .info-label {
                        font-weight: bold;
                        width: 110px;
                        flex-shrink: 0;
                        font-size: 10px;
                    }
                    .info-value {
                        font-size: 10px;
                    }

                    /* Items Table */
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
                    table {
                        width: 100%;
                        border-collapse: collapse;
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
                    th.center { text-align: center; }
                    td {
                        padding: 6px 8px;
                        border: 1px solid #ddd;
                        font-size: 10px;
                    }
                    td.right {
                        text-align: right;
                        font-variant-numeric: tabular-nums;
                    }
                    td.center { text-align: center; }
                    .total-row td {
                        font-weight: bold;
                        background: #1e293b !important;
                        color: white;
                        border-color: #334155;
                        font-size: 12px;
                    }

                    /* Notes */
                    .notes-box {
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 10px;
                        min-height: 40px;
                        font-size: 10px;
                        white-space: pre-wrap;
                        background: #fafafa;
                    }

                    /* Totals summary */
                    .totals-grid {
                        display: grid;
                        grid-template-columns: 1fr auto;
                        gap: 0;
                        margin-bottom: 16px;
                    }
                    .totals-table {
                        width: auto;
                        margin-left: auto;
                        min-width: 300px;
                    }
                    .totals-table td {
                        padding: 4px 10px;
                    }
                    .totals-table .label-cell {
                        text-align: right;
                        font-weight: 600;
                        border: none;
                        background: transparent;
                    }
                    .totals-table .value-cell {
                        text-align: right;
                        font-variant-numeric: tabular-nums;
                        border: 1px solid #ddd;
                        min-width: 140px;
                    }
                    .totals-table .grand-total .label-cell {
                        font-size: 12px;
                        font-weight: bold;
                    }
                    .totals-table .grand-total .value-cell {
                        font-size: 14px;
                        font-weight: bold;
                        background: #1e293b;
                        color: white;
                        border-color: #334155;
                    }

                    /* Signatures */
                    .signatures {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 40px;
                        margin-top: 40px;
                    }
                    .signature-line {
                        border-top: 1px solid #1a1a1a;
                        padding-top: 6px;
                        text-align: center;
                        font-size: 10px;
                        color: #333;
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

                {/* Document Header */}
                <div className="doc-header">
                    <div className="doc-header-top">
                        <div className="doc-header-left">
                            {company.logoUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={company.logoUrl} alt="Logo" className="doc-logo" />
                            )}
                            <div>
                                <div className="company-name">
                                    {company.tradeName || company.name}
                                </div>
                                <div className="company-detail">CNPJ: {company.cnpj}</div>
                                {company.address && (
                                    <div className="company-detail">
                                        {company.address}
                                        {company.city && ` - ${company.city}`}
                                        {company.state && `/${company.state}`}
                                        {company.zipCode && ` - CEP: ${company.zipCode}`}
                                    </div>
                                )}
                                {(company.phone || company.email) && (
                                    <div className="company-detail">
                                        {company.phone && `Tel: ${company.phone}`}
                                        {company.phone && company.email && ' | '}
                                        {company.email && `E-mail: ${company.email}`}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="doc-number-box">
                            <div className="doc-type">Faturamento</div>
                            <div className="doc-number">{billing.number}</div>
                            <div className={`doc-status status-${billing.status}`}>
                                {STATUS_LABELS[billing.status] || billing.status}
                            </div>
                        </div>
                    </div>

                    {/* Dates row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <div>
                            <strong>Data de Emissão:</strong> {fmtDate(billing.issuedDate || billing.createdAt)}
                        </div>
                        <div>
                            <strong>Data de Vencimento:</strong> {fmtDate(billing.dueDate)}
                        </div>
                        {billing.paidDate && (
                            <div>
                                <strong>Data de Pagamento:</strong> {fmtDate(billing.paidDate)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Client & Project Info */}
                <div className="info-grid">
                    <div className="info-box">
                        <div className="info-box-title">Dados do Cliente</div>
                        {billing.client ? (
                            <>
                                <div className="info-row">
                                    <span className="info-label">Nome:</span>
                                    <span className="info-value">{billing.client.displayName}</span>
                                </div>
                                {(billing.client.cnpj || billing.client.cpf) && (
                                    <div className="info-row">
                                        <span className="info-label">CNPJ/CPF:</span>
                                        <span className="info-value">{billing.client.cnpj || billing.client.cpf}</span>
                                    </div>
                                )}
                                {billing.client.email && (
                                    <div className="info-row">
                                        <span className="info-label">E-mail:</span>
                                        <span className="info-value">{billing.client.email}</span>
                                    </div>
                                )}
                                {billing.client.phone && (
                                    <div className="info-row">
                                        <span className="info-label">Telefone:</span>
                                        <span className="info-value">{billing.client.phone}</span>
                                    </div>
                                )}
                                {billing.client.address && (
                                    <div className="info-row">
                                        <span className="info-label">Endereço:</span>
                                        <span className="info-value">
                                            {billing.client.address}
                                            {billing.client.city && ` - ${billing.client.city}`}
                                            {billing.client.state && `/${billing.client.state}`}
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ color: '#888', fontSize: '10px' }}>
                                Cliente não informado
                            </div>
                        )}
                    </div>

                    <div className="info-box">
                        <div className="info-box-title">Referências</div>
                        {billing.project && (
                            <div className="info-row">
                                <span className="info-label">Projeto:</span>
                                <span className="info-value">{billing.project.name}</span>
                            </div>
                        )}
                        {billing.contract && (
                            <div className="info-row">
                                <span className="info-label">Contrato:</span>
                                <span className="info-value">{billing.contract.identifier}</span>
                            </div>
                        )}
                        {billing.measurementBulletin && (
                            <>
                                <div className="info-row">
                                    <span className="info-label">Medição:</span>
                                    <span className="info-value">#{billing.measurementBulletin.number}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Ref. Mês:</span>
                                    <span className="info-value">{billing.measurementBulletin.referenceMonth}</span>
                                </div>
                            </>
                        )}
                        <div className="info-row">
                            <span className="info-label">Criado por:</span>
                            <span className="info-value">{billing.createdBy?.name || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="section">
                    <div className="section-title">Itens</div>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }} className="center">#</th>
                                <th>Descrição</th>
                                <th className="right" style={{ width: '80px' }}>Qtd</th>
                                <th className="right" style={{ width: '130px' }}>Valor Unitário</th>
                                <th className="right" style={{ width: '130px' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="center">{idx + 1}</td>
                                    <td>{item.description}</td>
                                    <td className="right">{item.quantity}</td>
                                    <td className="right">{fmt(item.unitPrice)}</td>
                                    <td className="right">{fmt(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <table className="totals-table">
                    <tbody>
                        <tr>
                            <td className="label-cell">Subtotal:</td>
                            <td className="value-cell">{fmt(value)}</td>
                        </tr>
                        {paidAmount !== null && paidAmount !== value && (
                            <tr>
                                <td className="label-cell">Valor Pago:</td>
                                <td className="value-cell" style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                    {fmt(paidAmount)}
                                </td>
                            </tr>
                        )}
                        <tr className="grand-total">
                            <td className="label-cell">VALOR TOTAL:</td>
                            <td className="value-cell">{fmt(value)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Notes */}
                {billing.notes && (
                    <div className="section">
                        <div className="section-title">Observações</div>
                        <div className="notes-box">{billing.notes}</div>
                    </div>
                )}

                {/* Signatures */}
                <div className="signatures">
                    <div>
                        <div style={{ height: '50px' }} />
                        <div className="signature-line">
                            Emitente
                            <div style={{ fontWeight: 'bold', marginTop: '2px' }}>
                                {company.tradeName || company.name}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div style={{ height: '50px' }} />
                        <div className="signature-line">
                            Cliente / Tomador
                            {billing.client && (
                                <div style={{ fontWeight: 'bold', marginTop: '2px' }}>
                                    {billing.client.displayName}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="footer">
                    <span>
                        {company.tradeName || company.name} - Faturamento {billing.number}
                    </span>
                    <span>Gerado em {generatedAt}</span>
                </div>
            </body>
        </html>
    )
}

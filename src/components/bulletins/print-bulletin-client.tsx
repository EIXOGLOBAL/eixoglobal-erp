'use client'

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

// ============================================================
// TIPOS
// ============================================================

interface Company {
    id: string
    name: string
    cnpj: string
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
}

interface ContractItem {
    id: string
    description: string
    unit: string
    quantity: number
    unitPrice: number
}

interface BulletinItem {
    id: string
    itemCode?: string | null
    description: string
    unit: string
    unitPrice: number
    contractedQuantity: number
    previousMeasured: number
    currentMeasured: number
    accumulatedMeasured: number
    balanceQuantity: number
    currentValue: number
    accumulatedValue: number
    percentageExecuted: number
    contractItem?: ContractItem | null
}

interface BulletinComment {
    id: string
    text: string
    commentType: string
    createdAt: Date | string
    author?: { name: string | null } | null
}

interface BulletinProject {
    id: string
    name: string
}

interface BulletinContract {
    id: string
    identifier: string
    value?: number | null
}

interface BulletinUser {
    name?: string | null
}

interface Bulletin {
    id: string
    number: string
    referenceMonth: string
    periodStart: Date | string
    periodEnd: Date | string
    totalValue: number
    status: string
    rejectionReason?: string | null
    submittedAt?: Date | string | null
    approvedByEngineerAt?: Date | string | null
    createdAt: Date | string
    project: BulletinProject
    contract: BulletinContract
    items: BulletinItem[]
    comments: BulletinComment[]
    createdBy?: BulletinUser | null
    engineer?: BulletinUser | null
    manager?: BulletinUser | null
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    BILLED: "Faturado",
}

const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtQty = (n: number) =>
    n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

const fmtDate = (d: Date | string | null | undefined): string => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR')
}

const fmtPct = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

// ============================================================
// PROPS
// ============================================================

interface PrintBulletinClientProps {
    bulletin: Bulletin
    company?: Company | null
}

// ============================================================
// COMPONENTE
// ============================================================

export function PrintBulletinClient({ bulletin, company }: PrintBulletinClientProps) {
    const totalValue = bulletin.totalValue
    const totalAccumulated = bulletin.items.reduce((sum, item) => sum + item.accumulatedValue, 0)
    const contractValue = bulletin.contract.value ?? 0
    const balance = contractValue - totalAccumulated

    return (
        <>
            {/* ── Barra de controle — oculta na impressão ── */}
            <div className="no-print flex items-center gap-3 p-4 bg-muted/50 border-b sticky top-0 z-10">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/measurements/${bulletin.id}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Link>
                </Button>
                <span className="text-sm text-muted-foreground flex-1">
                    Pré-visualização de impressão —{' '}
                    <strong>{bulletin.number}</strong>{' '}
                    &middot; {bulletin.project.name}
                </span>
                <Button onClick={() => window.print()} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimir / Salvar PDF
                </Button>
            </div>

            {/* ── Área de impressão A4 ── */}
            <div
                id="print-content"
                className="bg-white text-black mx-auto my-6 p-8 max-w-[210mm] text-[11px] font-sans shadow-lg print:shadow-none print:my-0 print:p-0"
            >
                {/* ══ CABEÇALHO ══════════════════════════════════════════════ */}
                <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-5">
                    {/* Empresa */}
                    <div>
                        <h1 className="text-lg font-bold uppercase tracking-wide leading-tight">
                            {company?.name ?? 'Eixo Global Engenharia'}
                        </h1>
                        {company?.cnpj && (
                            <p className="text-[10px] text-gray-600 mt-0.5">
                                CNPJ: {company.cnpj}
                            </p>
                        )}
                        {company?.address && (
                            <p className="text-[10px] text-gray-500">
                                {company.address}
                                {company.city && `, ${company.city}`}
                                {company.state && `/${company.state}`}
                            </p>
                        )}
                        {company?.phone && (
                            <p className="text-[10px] text-gray-500">Tel: {company.phone}</p>
                        )}
                    </div>

                    {/* Identificação do documento */}
                    <div className="text-right">
                        <h2 className="text-base font-bold uppercase tracking-wider text-gray-800">
                            Boletim de Medição
                        </h2>
                        <p className="text-xl font-mono font-bold mt-0.5">{bulletin.number}</p>
                        <span
                            className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold border rounded ${
                                bulletin.status === 'APPROVED' || bulletin.status === 'BILLED'
                                    ? 'border-green-600 text-green-700 bg-green-50'
                                    : bulletin.status === 'REJECTED'
                                    ? 'border-red-500 text-red-700 bg-red-50'
                                    : bulletin.status === 'PENDING_APPROVAL'
                                    ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                                    : 'border-gray-400 text-gray-600 bg-gray-50'
                            }`}
                        >
                            {STATUS_LABELS[bulletin.status] ?? bulletin.status}
                        </span>
                    </div>
                </div>

                {/* ══ DADOS DO CONTRATO ══════════════════════════════════════ */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Dados do Contrato
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Projeto:</span>
                            <span className="font-medium">{bulletin.project.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Contrato:</span>
                            <span className="font-medium font-mono">{bulletin.contract.identifier}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Competência:</span>
                            <span>{bulletin.referenceMonth}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Status:</span>
                            <span>{STATUS_LABELS[bulletin.status] ?? bulletin.status}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Período:</span>
                            <span>
                                {fmtDate(bulletin.periodStart)} a {fmtDate(bulletin.periodEnd)}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Responsável:</span>
                            <span>{bulletin.createdBy?.name ?? 'Sistema'}</span>
                        </div>
                        {bulletin.engineer?.name && (
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-24 shrink-0">Analista:</span>
                                <span>{bulletin.engineer.name}</span>
                            </div>
                        )}
                        {bulletin.approvedByEngineerAt && (
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-24 shrink-0">Aprovado em:</span>
                                <span>{fmtDate(bulletin.approvedByEngineerAt)}</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* ══ PLANILHA DE MEDIÇÃO ════════════════════════════════════ */}
                <section className="mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Planilha de Medição
                    </h3>
                    <table className="w-full border-collapse text-[10px]">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="border border-gray-600 px-1.5 py-1.5 text-left w-6">#</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-left">Descrição do Serviço</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-center w-10">Un.</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-right w-16">Qtd. Contrato</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-right w-16">Qtd. Anterior</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-right w-16">Qtd. Medida</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-right w-18">Preço Unit.</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-right w-20">Total Medido</th>
                                <th className="border border-gray-600 px-1.5 py-1.5 text-right w-16">% Acum.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulletin.items.map((item, idx) => (
                                <tr
                                    key={item.id}
                                    className={`print-break-inside-avoid ${
                                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                                >
                                    <td className="border border-gray-300 px-1.5 py-1 text-center text-gray-400">
                                        {idx + 1}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1">
                                        {item.description}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center">
                                        {item.unit}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right">
                                        {fmtQty(item.contractedQuantity)}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right text-gray-500">
                                        {fmtQty(item.previousMeasured)}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                        {fmtQty(item.currentMeasured)}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right">
                                        {fmt(item.unitPrice)}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                        {fmt(item.currentValue)}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right">
                                        {fmtPct(item.percentageExecuted)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-200 font-bold border-t-2 border-gray-500">
                                <td
                                    colSpan={7}
                                    className="border border-gray-400 px-2 py-1.5 text-right uppercase text-[10px] tracking-wide"
                                >
                                    Total deste Boletim
                                </td>
                                <td className="border border-gray-400 px-2 py-1.5 text-right text-[11px]">
                                    {fmt(totalValue)}
                                </td>
                                <td className="border border-gray-400 px-2 py-1.5 text-right text-gray-500">—</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>

                {/* ══ RESUMO FINANCEIRO ══════════════════════════════════════ */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Resumo Financeiro
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                Valor Medido (este boletim)
                            </p>
                            <p className="text-base font-bold">{fmt(totalValue)}</p>
                        </div>
                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                Total Acumulado
                            </p>
                            <p className="text-base font-bold">{fmt(totalAccumulated)}</p>
                        </div>
                        {contractValue > 0 && (
                            <>
                                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                                    <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                        Valor do Contrato
                                    </p>
                                    <p className="text-base font-bold">{fmt(contractValue)}</p>
                                </div>
                                <div className={`border rounded p-3 ${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                        Saldo a Medir
                                    </p>
                                    <p className={`text-base font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {fmt(balance)}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ══ OBSERVAÇÕES / REJEIÇÃO ══════════════════════════════════ */}
                {bulletin.status === 'REJECTED' && bulletin.rejectionReason && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-600 border-b border-red-200 pb-1 mb-2">
                            Motivo de Rejeição
                        </h3>
                        <p className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded p-3">
                            {bulletin.rejectionReason}
                        </p>
                    </section>
                )}

                {/* Comentários relevantes (aprovação/rejeição) */}
                {bulletin.comments.length > 0 && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Observações e Histórico
                        </h3>
                        <div className="space-y-2">
                            {bulletin.comments.slice(0, 5).map((c) => (
                                <div key={c.id} className="text-[10px] border-l-2 border-gray-300 pl-3">
                                    <span className="font-semibold">{c.author?.name ?? 'Sistema'}</span>
                                    <span className="text-gray-400 ml-2">
                                        ({new Date(c.createdAt).toLocaleString('pt-BR')})
                                    </span>
                                    <span className="ml-2 text-gray-400">
                                        [{c.commentType}]
                                    </span>
                                    <p className="mt-0.5 text-gray-700">{c.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ══ ASSINATURAS ════════════════════════════════════════════ */}
                <section className="print-break-inside-avoid mt-10 pt-4 border-t-2 border-gray-300">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-5 text-center">
                        Assinaturas
                    </h3>
                    <div className="grid grid-cols-3 gap-6 text-[10px] text-center">
                        <div>
                            <div className="border-b border-gray-400 mb-3 h-14"></div>
                            <p className="font-semibold text-gray-800">Responsável pela Medição</p>
                            <p className="text-gray-500 mt-0.5">
                                {bulletin.createdBy?.name ?? '___________________'}
                            </p>
                            <p className="text-gray-400 mt-2">Data: _____ / _____ / _________</p>
                        </div>
                        <div>
                            <div className="border-b border-gray-400 mb-3 h-14"></div>
                            <p className="font-semibold text-gray-800">Fiscalização / Engenheiro</p>
                            <p className="text-gray-500 mt-0.5">
                                {bulletin.engineer?.name ?? '___________________'}
                            </p>
                            <p className="text-gray-400 mt-2">Data: _____ / _____ / _________</p>
                        </div>
                        <div>
                            <div className="border-b border-gray-400 mb-3 h-14"></div>
                            <p className="font-semibold text-gray-800">Aprovação / Gerência</p>
                            <p className="text-gray-500 mt-0.5">
                                {bulletin.manager?.name ?? '___________________'}
                            </p>
                            <p className="text-gray-400 mt-2">Data: _____ / _____ / _________</p>
                        </div>
                    </div>
                </section>

                {/* ══ RODAPÉ ═════════════════════════════════════════════════ */}
                <footer className="mt-6 pt-3 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between">
                    <span>ERP Eixo Global — Boletim de Medição {bulletin.number}</span>
                    <span>
                        Emitido em {new Date().toLocaleString('pt-BR')}
                    </span>
                    <span>{bulletin.project.name}</span>
                </footer>
            </div>

            {/* ── Estilos de impressão ── */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #print-content {
                        display: block !important;
                        position: static !important;
                        max-width: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                }
            `}</style>
        </>
    )
}

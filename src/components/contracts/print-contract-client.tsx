'use client'

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/formatters"

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

interface Contractor {
    id: string
    name: string
    document?: string | null
}

interface ContractProject {
    id: string
    name: string
}

interface ContractItem {
    id: string
    description: string
    unit: string
    quantity: number
    unitPrice: number
    measuredQuantity?: number
}

type AmendmentType = 'VALUE_CHANGE' | 'DEADLINE_CHANGE' | 'SCOPE_CHANGE' | 'MIXED'

interface Amendment {
    id: string
    number: string
    description: string
    type: AmendmentType
    oldValue?: number | null
    newValue?: number | null
    oldEndDate?: Date | string | null
    newEndDate?: Date | string | null
    justification: string
    createdAt: Date | string
}

interface ContractBulletin {
    id: string
    number: string
    referenceMonth: string
    status: string
    totalValue: number
}

interface Contract {
    id: string
    identifier: string
    description?: string | null
    value?: number | null
    startDate: Date | string
    endDate?: Date | string | null
    status: string
    companyId?: string | null
    createdAt: Date | string
    updatedAt: Date | string
    project: ContractProject
    contractor?: Contractor | null
    items?: ContractItem[]
    amendments?: Amendment[]
    bulletins?: ContractBulletin[]
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    ACTIVE: "Ativo",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
}

const AMENDMENT_TYPE_LABELS: Record<AmendmentType, string> = {
    VALUE_CHANGE: "Alteração de Valor",
    DEADLINE_CHANGE: "Prorrogação de Prazo",
    SCOPE_CHANGE: "Alteração de Escopo",
    MIXED: "Misto",
}

const BULLETIN_STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Ag. Aprovação",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    BILLED: "Faturado",
}

const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtQty = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })

const fmtDate = (d: Date | string | null | undefined): string => {
    if (!d) return '—'
    return formatDate(d)
}

// ============================================================
// PROPS
// ============================================================

interface PrintContractClientProps {
    contract: Contract
    company?: Company | null
}

// ============================================================
// COMPONENTE
// ============================================================

export function PrintContractClient({ contract, company }: PrintContractClientProps) {
    const totalValue = contract.value ?? 0
    const items = contract.items ?? []
    const amendments = contract.amendments ?? []
    const bulletins = contract.bulletins ?? []

    const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const totalMeasured = bulletins
        .filter(b => b.status === 'APPROVED' || b.status === 'BILLED')
        .reduce((sum, b) => sum + b.totalValue, 0)
    const balance = totalValue > 0 ? totalValue - totalMeasured : 0

    return (
        <>
            {/* ── Barra de controle — oculta na impressão ── */}
            <div className="no-print flex items-center gap-3 p-4 bg-muted/50 border-b sticky top-0 z-10">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/contratos/${contract.id}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Link>
                </Button>
                <span className="text-sm text-muted-foreground flex-1">
                    Pré-visualização do contrato{' '}
                    <strong>{contract.identifier}</strong>{' '}
                    &middot; {contract.project.name}
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
                            Contrato de Serviços
                        </h2>
                        <p className="text-xl font-mono font-bold mt-0.5">{contract.identifier}</p>
                        <span
                            className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold border rounded ${
                                contract.status === 'ACTIVE'
                                    ? 'border-green-600 text-green-700 bg-green-50'
                                    : contract.status === 'CANCELLED'
                                    ? 'border-red-500 text-red-700 bg-red-50'
                                    : contract.status === 'COMPLETED'
                                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                                    : 'border-gray-400 text-gray-600 bg-gray-50'
                            }`}
                        >
                            {STATUS_LABELS[contract.status] ?? contract.status}
                        </span>
                    </div>
                </div>

                {/* ══ PARTES CONTRATANTES ════════════════════════════════════ */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Partes Contratantes
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1 font-bold">
                                Contratante
                            </p>
                            <p className="font-semibold">{company?.name ?? 'Eixo Global Engenharia'}</p>
                            {company?.cnpj && (
                                <p className="text-[10px] text-gray-600">CNPJ: {company.cnpj}</p>
                            )}
                        </div>
                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1 font-bold">
                                Contratada / Empreiteira
                            </p>
                            <p className="font-semibold">
                                {contract.contractor?.name ?? 'Não informada'}
                            </p>
                            {contract.contractor?.document && (
                                <p className="text-[10px] text-gray-600">
                                    CNPJ/CPF: {contract.contractor.document}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* ══ DADOS DO CONTRATO ══════════════════════════════════════ */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Dados do Contrato
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Projeto:</span>
                            <span className="font-medium">{contract.project.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Identificador:</span>
                            <span className="font-mono font-medium">{contract.identifier}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Vigência:</span>
                            <span>
                                {fmtDate(contract.startDate)} a {fmtDate(contract.endDate)}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Valor Total:</span>
                            <span className="font-bold">{fmt(totalValue)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Status:</span>
                            <span>{STATUS_LABELS[contract.status] ?? contract.status}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Cadastrado:</span>
                            <span>{fmtDate(contract.createdAt)}</span>
                        </div>
                    </div>

                    {contract.description && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1 font-bold">
                                Objeto / Descrição
                            </p>
                            <p className="text-[11px]">{contract.description}</p>
                        </div>
                    )}
                </section>

                {/* ══ PLANILHA ORÇAMENTÁRIA ══════════════════════════════════ */}
                {items.length > 0 && (
                    <section className="mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Planilha Orçamentária ({items.length} itens)
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left w-6">#</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left">Descrição do Serviço</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-10">Un.</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-right w-20">Qtd. Contratada</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-right w-22">Preço Unit.</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-right w-24">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
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
                                            {fmtQty(item.quantity)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right">
                                            {fmt(item.unitPrice)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                            {fmt(item.quantity * item.unitPrice)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-200 font-bold border-t-2 border-gray-500">
                                    <td
                                        colSpan={5}
                                        className="border border-gray-400 px-2 py-1.5 text-right uppercase text-[10px] tracking-wide"
                                    >
                                        Total Geral da Planilha
                                    </td>
                                    <td className="border border-gray-400 px-2 py-1.5 text-right text-[11px]">
                                        {fmt(itemsTotal)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>
                )}

                {/* ══ RESUMO FINANCEIRO ══════════════════════════════════════ */}
                {totalValue > 0 && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Resumo Financeiro
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="border border-gray-200 rounded p-3 bg-gray-50">
                                <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                    Valor do Contrato
                                </p>
                                <p className="text-base font-bold">{fmt(totalValue)}</p>
                            </div>
                            <div className="border border-gray-200 rounded p-3 bg-gray-50">
                                <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                    Total Medido (Aprovado)
                                </p>
                                <p className="text-base font-bold">{fmt(totalMeasured)}</p>
                            </div>
                            <div className={`border rounded p-3 ${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                    Saldo a Medir
                                </p>
                                <p className={`text-base font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {fmt(balance)}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* ══ TERMOS ADITIVOS ════════════════════════════════════════ */}
                {amendments.length > 0 && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Termos Aditivos ({amendments.length})
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left w-16">N. Aditivo</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left w-28">Tipo</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left">Descrição / Justificativa</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-right w-20">Valor Anterior</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-right w-20">Valor Novo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {amendments.map((a, idx) => (
                                    <tr
                                        key={a.id}
                                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1 font-mono">
                                            {a.number}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {AMENDMENT_TYPE_LABELS[a.type] ?? a.type}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {a.description}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right text-gray-500">
                                            {a.oldValue != null ? fmt(a.oldValue) : '—'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                            {a.newValue != null ? fmt(a.newValue) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* ══ BOLETINS VINCULADOS ════════════════════════════════════ */}
                {bulletins.length > 0 && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Boletins de Medição ({bulletins.length})
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left">Número</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left">Competência</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left">Status</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bulletins.map((b, idx) => (
                                    <tr
                                        key={b.id}
                                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1 font-mono">
                                            {b.number}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {b.referenceMonth}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {BULLETIN_STATUS_LABELS[b.status] ?? b.status}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                            {fmt(b.totalValue)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                                    <td colSpan={3} className="border border-gray-300 px-1.5 py-1 text-right uppercase">
                                        Total Medido (Aprovado + Faturado)
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right">
                                        {fmt(totalMeasured)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                )}

                {/* ══ ASSINATURAS ════════════════════════════════════════════ */}
                <section className="print-break-inside-avoid mt-10 pt-4 border-t-2 border-gray-300">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-5 text-center">
                        Assinaturas
                    </h3>
                    <div className="grid grid-cols-2 gap-12 text-[10px] text-center">
                        <div>
                            <div className="border-b border-gray-400 mb-3 h-16"></div>
                            <p className="font-semibold text-gray-800">CONTRATANTE</p>
                            <p className="text-gray-600 mt-0.5">{company?.name ?? 'Eixo Global Engenharia'}</p>
                            {company?.cnpj && (
                                <p className="text-gray-400 text-[9px]">CNPJ: {company.cnpj}</p>
                            )}
                            <p className="text-gray-400 mt-2">Data: _____ / _____ / _________</p>
                        </div>
                        <div>
                            <div className="border-b border-gray-400 mb-3 h-16"></div>
                            <p className="font-semibold text-gray-800">CONTRATADA</p>
                            <p className="text-gray-600 mt-0.5">
                                {contract.contractor?.name ?? '___________________'}
                            </p>
                            {contract.contractor?.document && (
                                <p className="text-gray-400 text-[9px]">
                                    CNPJ/CPF: {contract.contractor.document}
                                </p>
                            )}
                            <p className="text-gray-400 mt-2">Data: _____ / _____ / _________</p>
                        </div>
                    </div>
                </section>

                {/* ══ RODAPÉ ═════════════════════════════════════════════════ */}
                <footer className="mt-6 pt-3 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between">
                    <span>ERP Eixo Global — Contrato {contract.identifier}</span>
                    <span>
                        Emitido em {new Date().toLocaleString('pt-BR')}
                    </span>
                    <span>{contract.project.name}</span>
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

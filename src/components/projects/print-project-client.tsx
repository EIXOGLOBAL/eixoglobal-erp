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
    tradeName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
}

interface Client {
    id: string
    name: string
    document?: string | null
    email?: string | null
    phone?: string | null
}

interface ContractItem {
    id: string
    description: string
    unit: string
    quantity: number
    unitPrice: number
}

interface ProjectContract {
    id: string
    identifier: string
    description?: string | null
    value: number | null
    startDate: Date | string
    endDate?: Date | string | null
    status: string
    items: ContractItem[]
}

interface Measurement {
    id: string
    date: Date | string
    quantity: number
    description?: string | null
    status: string
    contractItem?: {
        id: string
        description: string
        unit: string
        quantity: number
        unitPrice: number
        contractId: string
    } | null
    employee?: {
        id: string
        name: string
        jobTitle: string
    } | null
}

interface Allocation {
    id: string
    startDate: Date | string
    endDate?: Date | string | null
    employee: {
        id: string
        name: string
        jobTitle: string
        status: string
    }
}

interface ProjectTask {
    id: string
    name: string
    phase?: string | null
    startDate: Date | string
    endDate: Date | string
    percentDone: number
    status: string
    isMilestone: boolean
}

interface Project {
    id: string
    code?: string | null
    name: string
    description?: string | null
    location?: string | null
    startDate: Date | string
    endDate?: Date | string | null
    budget: number
    status: string
    company?: Company | null
    client?: Client | null
    contracts: ProjectContract[]
    measurements: Measurement[]
    allocations: Allocation[]
    tasks: ProjectTask[]
    measurementsCount: number
    contractsCount: number
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
    PLANNING: "Planejamento",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    ON_HOLD: "Pausado",
    CANCELLED: "Cancelado",
    BIDDING: "Licitacao",
}

const CONTRACT_STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    ACTIVE: "Ativo",
    COMPLETED: "Concluido",
    CANCELLED: "Cancelado",
    SUSPENDED: "Suspenso",
    PENDING_SIGNATURE: "Aguardando Assinatura",
}

const MEASUREMENT_STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    SUBMITTED: "Submetida",
    APPROVED: "Aprovada",
    REJECTED: "Rejeitada",
}

const TASK_STATUS_LABELS: Record<string, string> = {
    TODO: "A fazer",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    ON_HOLD: "Pausado",
    CANCELLED: "Cancelado",
    BLOCKED: "Bloqueado",
    WAITING_APPROVAL: "Aguardando Aprovacao",
}

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    ON_LEAVE: "Afastado",
}

const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtQty = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })

const fmtDate = (d: Date | string | null | undefined): string => {
    if (!d) return '\u2014'
    return formatDate(d)
}

const fmtPct = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

// ============================================================
// PROPS
// ============================================================

interface PrintProjectClientProps {
    project: Project
}

// ============================================================
// COMPONENTE
// ============================================================

export function PrintProjectClient({ project }: PrintProjectClientProps) {
    const company = project.company
    const totalContractsValue = project.contracts.reduce((sum, c) => sum + (c.value ?? 0), 0)
    const approvedMeasurements = project.measurements.filter(m => m.status === 'APPROVED')
    const totalMeasuredValue = approvedMeasurements.reduce((sum, m) => {
        const price = m.contractItem?.unitPrice ?? 0
        return sum + Number(m.quantity) * price
    }, 0)
    const activeAllocations = project.allocations.filter(a => !a.endDate)
    const avgTaskProgress = project.tasks.length > 0
        ? project.tasks.reduce((sum, t) => sum + t.percentDone, 0) / project.tasks.length
        : 0

    return (
        <>
            {/* Barra de controle - oculta na impressao */}
            <div className="no-print flex items-center gap-3 p-4 bg-muted/50 border-b sticky top-0 z-10">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/projects/${project.id}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Link>
                </Button>
                <span className="text-sm text-muted-foreground flex-1">
                    Relatorio do Projeto &mdash;{' '}
                    <strong>{project.name}</strong>
                </span>
                <Button onClick={() => window.print()} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimir / Salvar PDF
                </Button>
            </div>

            {/* Area de impressao A4 */}
            <div
                id="print-content"
                className="bg-white text-black mx-auto my-6 p-8 max-w-[210mm] text-[11px] font-sans shadow-lg print:shadow-none print:my-0 print:p-0"
            >
                {/* CABECALHO */}
                <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-5">
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
                    </div>
                    <div className="text-right">
                        <h2 className="text-base font-bold uppercase tracking-wider text-gray-800">
                            Relatorio de Projeto
                        </h2>
                        {project.code && (
                            <p className="text-xl font-mono font-bold mt-0.5">{project.code}</p>
                        )}
                        <span
                            className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold border rounded ${
                                project.status === 'IN_PROGRESS'
                                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                                    : project.status === 'COMPLETED'
                                    ? 'border-green-600 text-green-700 bg-green-50'
                                    : project.status === 'CANCELLED'
                                    ? 'border-red-500 text-red-700 bg-red-50'
                                    : 'border-gray-400 text-gray-600 bg-gray-50'
                            }`}
                        >
                            {STATUS_LABELS[project.status] ?? project.status}
                        </span>
                    </div>
                </div>

                {/* DADOS DO PROJETO */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Dados do Projeto
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Nome:</span>
                            <span className="font-medium">{project.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Codigo:</span>
                            <span className="font-mono">{project.code ?? '\u2014'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Local:</span>
                            <span>{project.location ?? '\u2014'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Orcamento:</span>
                            <span className="font-bold">{fmt(project.budget)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Inicio:</span>
                            <span>{fmtDate(project.startDate)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-24 shrink-0">Previsao Fim:</span>
                            <span>{fmtDate(project.endDate)}</span>
                        </div>
                        {project.client && (
                            <>
                                <div className="flex gap-2">
                                    <span className="font-semibold text-gray-600 w-24 shrink-0">Cliente:</span>
                                    <span>{project.client.name}</span>
                                </div>
                                {project.client.document && (
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-gray-600 w-24 shrink-0">CNPJ/CPF:</span>
                                        <span className="font-mono">{project.client.document}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    {project.description && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1 font-bold">
                                Descricao
                            </p>
                            <p className="text-[11px] whitespace-pre-wrap">{project.description}</p>
                        </div>
                    )}
                </section>

                {/* RESUMO FINANCEIRO */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Resumo Financeiro
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Orcamento</p>
                            <p className="text-sm font-bold">{fmt(project.budget)}</p>
                        </div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Contratos</p>
                            <p className="text-sm font-bold">{fmt(totalContractsValue)}</p>
                        </div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Total Medido</p>
                            <p className="text-sm font-bold">{fmt(totalMeasuredValue)}</p>
                        </div>
                        <div className={`border rounded p-2 ${
                            project.budget - totalContractsValue >= 0
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Saldo Orcamento</p>
                            <p className={`text-sm font-bold ${
                                project.budget - totalContractsValue >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                                {fmt(project.budget - totalContractsValue)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* CRONOGRAMA / TAREFAS */}
                {project.tasks.length > 0 && (
                    <section className="mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Cronograma ({project.tasks.length} tarefas &mdash; Progresso Medio: {fmtPct(avgTaskProgress)})
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left">Tarefa</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left w-20">Fase</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-20">Inicio</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-20">Fim</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-16">Progresso</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-20">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.tasks.map((task, idx) => (
                                    <tr
                                        key={task.id}
                                        className={`print-break-inside-avoid ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        } ${task.isMilestone ? 'font-semibold' : ''}`}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {task.isMilestone && (
                                                <span className="text-amber-600 mr-1" title="Marco">&#9670;</span>
                                            )}
                                            {task.name}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-gray-500">
                                            {task.phase ?? '\u2014'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtDate(task.startDate)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtDate(task.endDate)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtPct(task.percentDone)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {TASK_STATUS_LABELS[task.status] ?? task.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* CONTRATOS */}
                {project.contracts.length > 0 && (
                    <section className="mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Contratos ({project.contracts.length})
                        </h3>
                        {project.contracts.map((contract) => {
                            const itemsTotal = contract.items.reduce(
                                (sum, item) => sum + item.quantity * item.unitPrice, 0
                            )
                            return (
                                <div key={contract.id} className="print-break-inside-avoid mb-3 border border-gray-200 rounded p-3">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mb-2">
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Contrato:</span>
                                            <span className="font-mono font-medium">{contract.identifier}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Status:</span>
                                            <span>{CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Valor:</span>
                                            <span className="font-bold">{contract.value ? fmt(contract.value) : '\u2014'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Vigencia:</span>
                                            <span>{fmtDate(contract.startDate)} a {fmtDate(contract.endDate)}</span>
                                        </div>
                                    </div>
                                    {contract.items.length > 0 && (
                                        <table className="w-full border-collapse text-[10px]">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-300 px-1.5 py-1 text-left">Item</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-center w-10">Un.</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-right w-16">Qtd.</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-right w-20">P. Unit.</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-right w-20">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {contract.items.map((item, iIdx) => (
                                                    <tr key={item.id} className={iIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="border border-gray-300 px-1.5 py-0.5">{item.description}</td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-center">{item.unit}</td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-right">{fmtQty(item.quantity)}</td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-right">{fmt(item.unitPrice)}</td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-right font-semibold">
                                                            {fmt(item.quantity * item.unitPrice)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-100 font-bold">
                                                    <td colSpan={4} className="border border-gray-300 px-1.5 py-1 text-right uppercase text-[9px]">
                                                        Total Itens
                                                    </td>
                                                    <td className="border border-gray-300 px-1.5 py-1 text-right">
                                                        {fmt(itemsTotal)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )
                        })}
                    </section>
                )}

                {/* MEDICOES RECENTES */}
                {project.measurements.length > 0 && (
                    <section className="mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Medicoes Recentes ({project.measurements.length} de {project.measurementsCount})
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-20">Data</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left">Item Contratual</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-right w-16">Qtd.</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left w-28">Responsavel</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-20">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.measurements.map((m, idx) => (
                                    <tr
                                        key={m.id}
                                        className={`print-break-inside-avoid ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtDate(m.date)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {m.contractItem?.description ?? m.description ?? '\u2014'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                            {fmtQty(Number(m.quantity))}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {m.employee?.name ?? '\u2014'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {MEASUREMENT_STATUS_LABELS[m.status] ?? m.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* ALOCACOES / EQUIPE */}
                {project.allocations.length > 0 && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Equipe Alocada ({project.allocations.length} &mdash; {activeAllocations.length} ativo{activeAllocations.length !== 1 ? 's' : ''})
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left">Funcionario</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left w-28">Cargo</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-center w-16">Status</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-center w-20">Inicio</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-center w-20">Fim</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.allocations.map((alloc, idx) => (
                                    <tr
                                        key={alloc.id}
                                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1 font-medium">
                                            {alloc.employee.name}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-gray-600">
                                            {alloc.employee.jobTitle}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {EMPLOYEE_STATUS_LABELS[alloc.employee.status] ?? alloc.employee.status}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtDate(alloc.startDate)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtDate(alloc.endDate)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* RODAPE */}
                <footer className="mt-6 pt-3 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between">
                    <span>ERP Eixo Global &mdash; Relatorio de Projeto</span>
                    <span>
                        Emitido em {new Date().toLocaleString('pt-BR')}
                    </span>
                    <span>{project.name} {project.code ? `(${project.code})` : ''}</span>
                </footer>
            </div>

            {/* Estilos de impressao */}
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

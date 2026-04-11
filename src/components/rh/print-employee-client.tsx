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

interface AllocationProject {
    id: string
    name: string
    code?: string | null
    status: string
}

interface EmployeeAllocation {
    id: string
    startDate: Date | string
    endDate?: Date | string | null
    project: AllocationProject
}

interface VariableBenefit {
    id: string
    name: string
    type: string
    value: number
    isActive: boolean
}

interface TrainingParticipation {
    id: string
    attended: boolean
    certified: boolean
    training: {
        id: string
        title: string
        type: string
        status: string
        startDate: Date | string
        endDate?: Date | string | null
        hours: number
        instructor?: string | null
    }
}

interface SalaryHistoryEntry {
    id: string
    previousCost: number | null
    newCost: number
    reason?: string | null
    effectiveDate: Date | string
}

interface Employee {
    id: string
    matricula?: string | null
    name: string
    jobTitle: string
    document?: string | null
    status: string
    department?: string | null
    admissionDate?: Date | string | null
    leaveDate?: Date | string | null
    terminationDate?: Date | string | null
    monthlySalary?: number | null
    costPerHour?: number | null
    hoursPerMonth: number
    housed: boolean
    valeTransporte: boolean
    vtDailyValue?: number | null
    valeAlimentacao?: number | null
    planoSaude?: number | null
    outrosBeneficios?: number | null
    bankName?: string | null
    bankAgency?: string | null
    bankAccount?: string | null
    pixKey?: string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    allocations: EmployeeAllocation[]
    variableBenefits: VariableBenefit[]
    trainingParticipations: TrainingParticipation[]
    salaryHistory: SalaryHistoryEntry[]
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    ON_LEAVE: "Afastado",
    BLOCKED: "Bloqueado",
    SUSPENDED: "Suspenso",
    ON_PROBATION: "Experiencia",
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
    PLANNING: "Planejamento",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    ON_HOLD: "Pausado",
    CANCELLED: "Cancelado",
    BIDDING: "Licitacao",
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
    INTERNAL: "Interno",
    EXTERNAL: "Externo",
    NR: "NR",
    CERTIFICATION: "Certificacao",
    OTHER: "Outro",
}

const TRAINING_STATUS_LABELS: Record<string, string> = {
    SCHEDULED: "Agendado",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    CANCELLED: "Cancelado",
}

const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtDate = (d: Date | string | null | undefined): string => {
    if (!d) return '\u2014'
    return formatDate(d)
}

// ============================================================
// PROPS
// ============================================================

interface PrintEmployeeClientProps {
    employee: Employee
    company?: Company | null
}

// ============================================================
// COMPONENTE
// ============================================================

export function PrintEmployeeClient({ employee, company }: PrintEmployeeClientProps) {
    const activeBenefits = employee.variableBenefits.filter(b => b.isActive)
    const totalFixedBenefits =
        (employee.vtDailyValue ?? 0) * 22 +
        (employee.valeAlimentacao ?? 0) +
        (employee.planoSaude ?? 0) +
        (employee.outrosBeneficios ?? 0)
    const totalVariableBenefits = activeBenefits.reduce((sum, b) => sum + b.value, 0)

    return (
        <>
            {/* Barra de controle - oculta na impressao */}
            <div className="no-print flex items-center gap-3 p-4 bg-muted/50 border-b sticky top-0 z-10">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/rh/funcionarios/${employee.id}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Link>
                </Button>
                <span className="text-sm text-muted-foreground flex-1">
                    Ficha do Funcionario &mdash;{' '}
                    <strong>{employee.name}</strong>
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
                            Ficha de Funcionario
                        </h2>
                        {employee.matricula && (
                            <p className="text-xl font-mono font-bold mt-0.5">{employee.matricula}</p>
                        )}
                        <span
                            className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold border rounded ${
                                employee.status === 'ACTIVE'
                                    ? 'border-green-600 text-green-700 bg-green-50'
                                    : employee.status === 'ON_LEAVE'
                                    ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                                    : 'border-gray-400 text-gray-600 bg-gray-50'
                            }`}
                        >
                            {STATUS_LABELS[employee.status] ?? employee.status}
                        </span>
                    </div>
                </div>

                {/* DADOS PESSOAIS */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Dados Pessoais
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Nome:</span>
                            <span className="font-medium">{employee.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">CPF:</span>
                            <span className="font-mono">{employee.document ?? '\u2014'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Cargo:</span>
                            <span>{employee.jobTitle}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Departamento:</span>
                            <span>{employee.department ?? '\u2014'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Admissao:</span>
                            <span>{fmtDate(employee.admissionDate)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Desligamento:</span>
                            <span>{fmtDate(employee.terminationDate)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Alojado:</span>
                            <span>{employee.housed ? 'Sim' : 'Nao'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Matricula:</span>
                            <span className="font-mono">{employee.matricula ?? '\u2014'}</span>
                        </div>
                    </div>
                </section>

                {/* CONTATO DE EMERGENCIA */}
                {(employee.emergencyContactName || employee.emergencyContactPhone) && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Contato de Emergencia
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-28 shrink-0">Nome:</span>
                                <span>{employee.emergencyContactName ?? '\u2014'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-28 shrink-0">Telefone:</span>
                                <span>{employee.emergencyContactPhone ?? '\u2014'}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* DADOS BANCARIOS */}
                {(employee.bankName || employee.pixKey) && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Dados Bancarios
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-28 shrink-0">Banco:</span>
                                <span>{employee.bankName ?? '\u2014'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-28 shrink-0">Agencia:</span>
                                <span>{employee.bankAgency ?? '\u2014'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-28 shrink-0">Conta:</span>
                                <span>{employee.bankAccount ?? '\u2014'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600 w-28 shrink-0">Chave PIX:</span>
                                <span>{employee.pixKey ?? '\u2014'}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* SALARIO E BENEFICIOS */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Remuneracao e Beneficios
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                Salario Mensal
                            </p>
                            <p className="text-base font-bold">
                                {employee.monthlySalary ? fmt(employee.monthlySalary) : '\u2014'}
                            </p>
                        </div>
                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                Custo/Hora
                            </p>
                            <p className="text-base font-bold">
                                {employee.costPerHour ? fmt(employee.costPerHour) : '\u2014'}
                            </p>
                        </div>
                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                Horas/Mes
                            </p>
                            <p className="text-base font-bold">{employee.hoursPerMonth}h</p>
                        </div>
                    </div>

                    {/* Beneficios fixos */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mb-2">
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Vale Transporte:</span>
                            <span>
                                {employee.valeTransporte
                                    ? employee.vtDailyValue
                                        ? `Sim - ${fmt(employee.vtDailyValue)}/dia`
                                        : 'Sim'
                                    : 'Nao'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Vale Alimentacao:</span>
                            <span>{employee.valeAlimentacao ? fmt(employee.valeAlimentacao) : '\u2014'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Plano Saude:</span>
                            <span>{employee.planoSaude ? fmt(employee.planoSaude) : '\u2014'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28 shrink-0">Outros:</span>
                            <span>{employee.outrosBeneficios ? fmt(employee.outrosBeneficios) : '\u2014'}</span>
                        </div>
                    </div>

                    {/* Beneficios variaveis */}
                    {activeBenefits.length > 0 && (
                        <div className="mt-2">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1 font-bold">
                                Beneficios Variaveis
                            </p>
                            <table className="w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-1.5 py-1 text-left">Nome</th>
                                        <th className="border border-gray-300 px-1.5 py-1 text-left w-24">Tipo</th>
                                        <th className="border border-gray-300 px-1.5 py-1 text-right w-24">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeBenefits.map((b) => (
                                        <tr key={b.id}>
                                            <td className="border border-gray-300 px-1.5 py-1">{b.name}</td>
                                            <td className="border border-gray-300 px-1.5 py-1">{b.type}</td>
                                            <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                                {fmt(b.value)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Resumo */}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                Total Beneficios Fixos
                            </p>
                            <p className="text-sm font-bold">{fmt(totalFixedBenefits)}</p>
                        </div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                                Total Beneficios Variaveis
                            </p>
                            <p className="text-sm font-bold">{fmt(totalVariableBenefits)}</p>
                        </div>
                    </div>
                </section>

                {/* HISTORICO DE ALOCACOES EM PROJETOS */}
                {employee.allocations.length > 0 && (
                    <section className="mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Historico de Alocacoes em Projetos ({employee.allocations.length})
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left">Projeto</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left w-16">Codigo</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left w-20">Status</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-24">Inicio</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-24">Fim</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employee.allocations.map((alloc, idx) => (
                                    <tr
                                        key={alloc.id}
                                        className={`print-break-inside-avoid ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1 font-medium">
                                            {alloc.project.name}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 font-mono text-gray-500">
                                            {alloc.project.code ?? '\u2014'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {PROJECT_STATUS_LABELS[alloc.project.status] ?? alloc.project.status}
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

                {/* TREINAMENTOS E CERTIFICACOES */}
                {employee.trainingParticipations.length > 0 && (
                    <section className="mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Treinamentos e Certificacoes ({employee.trainingParticipations.length})
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-left">Treinamento</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-16">Tipo</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-14">Horas</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-24">Data</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-16">Presenca</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-16">Cert.</th>
                                    <th className="border border-gray-600 px-1.5 py-1.5 text-center w-20">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employee.trainingParticipations.map((tp, idx) => (
                                    <tr
                                        key={tp.id}
                                        className={`print-break-inside-avoid ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {tp.training.title}
                                            {tp.training.instructor && (
                                                <span className="text-gray-400 ml-1">
                                                    ({tp.training.instructor})
                                                </span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {TRAINING_TYPE_LABELS[tp.training.type] ?? tp.training.type}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {tp.training.hours}h
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtDate(tp.training.startDate)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {tp.attended ? 'Sim' : 'Nao'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {tp.certified ? 'Sim' : 'Nao'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {TRAINING_STATUS_LABELS[tp.training.status] ?? tp.training.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* HISTORICO SALARIAL */}
                {employee.salaryHistory.length > 0 && (
                    <section className="print-break-inside-avoid mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                            Historico Salarial
                        </h3>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-center w-24">Data</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-right w-24">Anterior</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-right w-24">Novo</th>
                                    <th className="border border-gray-300 px-1.5 py-1.5 text-left">Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employee.salaryHistory.map((h, idx) => (
                                    <tr
                                        key={h.id}
                                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    >
                                        <td className="border border-gray-300 px-1.5 py-1 text-center">
                                            {fmtDate(h.effectiveDate)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right text-gray-500">
                                            {h.previousCost != null ? fmt(h.previousCost) : '\u2014'}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                                            {fmt(h.newCost)}
                                        </td>
                                        <td className="border border-gray-300 px-1.5 py-1">
                                            {h.reason ?? '\u2014'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* RODAPE */}
                <footer className="mt-6 pt-3 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between">
                    <span>ERP Eixo Global &mdash; Ficha de Funcionario</span>
                    <span>
                        Emitido em {new Date().toLocaleString('pt-BR')}
                    </span>
                    <span>{employee.name} {employee.matricula ? `(${employee.matricula})` : ''}</span>
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

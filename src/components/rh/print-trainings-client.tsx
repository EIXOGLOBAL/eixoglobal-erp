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

interface Participant {
    id: string
    attended: boolean
    certified: boolean
    notes?: string | null
    employee: {
        id: string
        name: string
        jobTitle: string
    }
}

interface Training {
    id: string
    title: string
    description?: string | null
    instructor?: string | null
    location?: string | null
    startDate: Date | string
    endDate?: Date | string | null
    hours: number
    maxParticipants?: number | null
    status: string
    type: string
    cost?: number | null
    participants: Participant[]
    participantCount: number
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
    SCHEDULED: "Agendado",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    CANCELLED: "Cancelado",
}

const TYPE_LABELS: Record<string, string> = {
    INTERNAL: "Interno",
    EXTERNAL: "Externo",
    NR: "Norma Regulamentadora (NR)",
    CERTIFICATION: "Certificacao Profissional",
    OTHER: "Outro",
}

const TYPE_ORDER: Record<string, number> = {
    NR: 0,
    CERTIFICATION: 1,
    INTERNAL: 2,
    EXTERNAL: 3,
    OTHER: 4,
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

interface PrintTrainingsClientProps {
    trainings: Training[]
    company?: Company | null
}

// ============================================================
// COMPONENTE
// ============================================================

export function PrintTrainingsClient({ trainings, company }: PrintTrainingsClientProps) {
    // Agrupar por tipo
    const grouped = trainings.reduce<Record<string, Training[]>>((acc, t) => {
        const key = t.type
        if (!acc[key]) acc[key] = []
        acc[key].push(t)
        return acc
    }, {})

    // Ordenar os grupos
    const sortedTypes = Object.keys(grouped).sort(
        (a, b) => (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99)
    )

    const totalTrainings = trainings.length
    const totalCompleted = trainings.filter(t => t.status === 'COMPLETED').length
    const totalParticipants = trainings.reduce((sum, t) => sum + t.participantCount, 0)
    const totalCost = trainings.reduce((sum, t) => sum + (t.cost ?? 0), 0)
    const totalHours = trainings.reduce((sum, t) => sum + t.hours, 0)

    return (
        <>
            {/* Barra de controle - oculta na impressao */}
            <div className="no-print flex items-center gap-3 p-4 bg-muted/50 border-b sticky top-0 z-10">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/rh/treinamentos">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Link>
                </Button>
                <span className="text-sm text-muted-foreground flex-1">
                    Relatorio de Treinamentos &mdash;{' '}
                    <strong>{totalTrainings} treinamentos</strong>
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
                            Relatorio de Treinamentos
                        </h2>
                        <p className="text-[10px] text-gray-500 mt-1">
                            {totalTrainings} treinamento{totalTrainings !== 1 ? 's' : ''} registrado{totalTrainings !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* RESUMO GERAL */}
                <section className="print-break-inside-avoid mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                        Resumo Geral
                    </h3>
                    <div className="grid grid-cols-5 gap-3">
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Total</p>
                            <p className="text-sm font-bold">{totalTrainings}</p>
                        </div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Concluidos</p>
                            <p className="text-sm font-bold text-green-700">{totalCompleted}</p>
                        </div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Participantes</p>
                            <p className="text-sm font-bold">{totalParticipants}</p>
                        </div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Horas Totais</p>
                            <p className="text-sm font-bold">{totalHours}h</p>
                        </div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Custo Total</p>
                            <p className="text-sm font-bold">{fmt(totalCost)}</p>
                        </div>
                    </div>
                </section>

                {/* TREINAMENTOS POR TIPO */}
                {sortedTypes.map((type) => {
                    const items = grouped[type]
                    return (
                        <section key={type} className="mb-6">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">
                                {TYPE_LABELS[type] ?? type} ({items.length})
                            </h3>

                            {items.map((training, tIdx) => (
                                <div
                                    key={training.id}
                                    className={`print-break-inside-avoid mb-4 ${tIdx > 0 ? 'pt-3 border-t border-gray-100' : ''}`}
                                >
                                    {/* Info do treinamento */}
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mb-2">
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Titulo:</span>
                                            <span className="font-medium">{training.title}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Status:</span>
                                            <span
                                                className={`font-semibold ${
                                                    training.status === 'COMPLETED'
                                                        ? 'text-green-700'
                                                        : training.status === 'CANCELLED'
                                                        ? 'text-red-600'
                                                        : 'text-gray-800'
                                                }`}
                                            >
                                                {STATUS_LABELS[training.status] ?? training.status}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Instrutor:</span>
                                            <span>{training.instructor ?? '\u2014'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Local:</span>
                                            <span>{training.location ?? '\u2014'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Periodo:</span>
                                            <span>
                                                {fmtDate(training.startDate)}
                                                {training.endDate ? ` a ${fmtDate(training.endDate)}` : ''}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-gray-600 w-20 shrink-0">Carga Hor.:</span>
                                            <span>{training.hours}h</span>
                                        </div>
                                        {training.cost != null && training.cost > 0 && (
                                            <div className="flex gap-2">
                                                <span className="font-semibold text-gray-600 w-20 shrink-0">Custo:</span>
                                                <span>{fmt(training.cost)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Participantes */}
                                    {training.participants.length > 0 && (
                                        <table className="w-full border-collapse text-[10px] mt-1">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-300 px-1.5 py-1 text-left w-6">#</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-left">Participante</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-left w-28">Cargo</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-center w-16">Presenca</th>
                                                    <th className="border border-gray-300 px-1.5 py-1 text-center w-16">Certificado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {training.participants.map((p, pIdx) => (
                                                    <tr
                                                        key={p.id}
                                                        className={pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                                    >
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-center text-gray-600">
                                                            {pIdx + 1}
                                                        </td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5">
                                                            {p.employee.name}
                                                        </td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-gray-600">
                                                            {p.employee.jobTitle}
                                                        </td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-center">
                                                            <span className={p.attended ? 'text-green-700 font-semibold' : 'text-gray-600'}>
                                                                {p.attended ? 'Sim' : 'Nao'}
                                                            </span>
                                                        </td>
                                                        <td className="border border-gray-300 px-1.5 py-0.5 text-center">
                                                            <span className={p.certified ? 'text-green-700 font-semibold' : 'text-gray-600'}>
                                                                {p.certified ? 'Sim' : 'Nao'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {training.participants.length === 0 && (
                                        <p className="text-[10px] text-gray-600 italic ml-2">
                                            Nenhum participante registrado
                                        </p>
                                    )}
                                </div>
                            ))}
                        </section>
                    )
                })}

                {trainings.length === 0 && (
                    <section className="mb-5">
                        <p className="text-center text-gray-600 py-8">
                            Nenhum treinamento registrado.
                        </p>
                    </section>
                )}

                {/* RODAPE */}
                <footer className="mt-6 pt-3 border-t border-gray-200 text-[9px] text-gray-600 flex justify-between">
                    <span>ERP Eixo Global &mdash; Relatorio de Treinamentos</span>
                    <span>
                        Emitido em {new Date().toLocaleString('pt-BR')}
                    </span>
                    <span>{company?.name ?? 'Eixo Global Engenharia'}</span>
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

import { notFound } from "next/navigation"
import { getDailyReportById } from "@/app/actions/daily-report-actions"
import { PrintButton } from "@/components/rdo/print-button"
import { toNumber, formatDate} from "@/lib/formatters"

export const dynamic = "force-dynamic"

const WEATHER_LABELS: Record<string, string> = {
    SUNNY: "Ensolarado ☀️",
    CLOUDY: "Nublado ⛅",
    RAINY: "Chuvoso 🌧️",
    STORMY: "Tempestuoso ⛈️",
    WINDY: "Ventoso 💨",
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    SUBMITTED: "Submetido",
    APPROVED: "Aprovado",
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function RdoPrintPage({ params }: PageProps) {
    const { id } = await params
    const report = await getDailyReportById(id)

    if (!report) notFound()

    const fmtDate = (d: Date) => formatDate(d)

    const totalWorkers = report.workforce.reduce((sum, w) => sum + w.count, 0)

    return (
        <html lang="pt-BR">
            <head>
                <meta charSet="UTF-8" />
                <title>RDO - {fmtDate(report.date)} - {report.project.name}</title>
                <style>{`
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        color: #1a1a1a;
                        background: white;
                        padding: 20mm;
                    }
                    @page { size: A4; margin: 20mm; }
                    @media print {
                        body { padding: 0; }
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #1a1a1a;
                        padding-bottom: 12px;
                        margin-bottom: 16px;
                    }
                    .header h1 {
                        font-size: 18px;
                        font-weight: bold;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                    }
                    .header .subtitle {
                        font-size: 11px;
                        color: #555;
                        margin-top: 4px;
                    }
                    .meta-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 8px;
                        margin-bottom: 16px;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        background: #f9f9f9;
                    }
                    .meta-item label {
                        font-size: 10px;
                        font-weight: bold;
                        text-transform: uppercase;
                        color: #666;
                        display: block;
                    }
                    .meta-item span {
                        font-size: 13px;
                        font-weight: 500;
                    }
                    .section {
                        margin-bottom: 20px;
                    }
                    .section-title {
                        font-size: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        border-bottom: 1px solid #1a1a1a;
                        padding-bottom: 4px;
                        margin-bottom: 8px;
                        color: #1a1a1a;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th {
                        background: #f0f0f0;
                        font-weight: bold;
                        font-size: 11px;
                        text-align: left;
                        padding: 6px 8px;
                        border: 1px solid #ccc;
                    }
                    td {
                        padding: 5px 8px;
                        border: 1px solid #ddd;
                        font-size: 11px;
                    }
                    tr:nth-child(even) td { background: #fafafa; }
                    .total-row td {
                        font-weight: bold;
                        background: #e8e8e8 !important;
                    }
                    .observations {
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 10px;
                        min-height: 60px;
                        font-size: 11px;
                        white-space: pre-wrap;
                        background: #fafafa;
                    }
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
                        font-size: 11px;
                        color: #333;
                    }
                    .progress-bar {
                        display: inline-block;
                        width: 60px;
                        height: 8px;
                        background: #e0e0e0;
                        border-radius: 4px;
                        vertical-align: middle;
                        margin-right: 4px;
                    }
                    .progress-fill {
                        height: 100%;
                        background: #2563eb;
                        border-radius: 4px;
                    }
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
                    <h1>Relatório Diário de Obra</h1>
                    <div className="subtitle">
                        Data: {fmtDate(report.date)} &nbsp;|&nbsp; Projeto: {report.project.name} &nbsp;|&nbsp; Status: {STATUS_LABELS[report.status]}
                    </div>
                </div>

                {/* Meta info */}
                <div className="meta-grid">
                    <div className="meta-item">
                        <label>Data</label>
                        <span>{fmtDate(report.date)}</span>
                    </div>
                    <div className="meta-item">
                        <label>Clima</label>
                        <span>{WEATHER_LABELS[report.weather]}</span>
                    </div>
                    <div className="meta-item">
                        <label>Temperatura</label>
                        <span>{report.temperature != null ? `${toNumber(report.temperature)}°C` : "—"}</span>
                    </div>
                    <div className="meta-item">
                        <label>Projeto</label>
                        <span>{report.project.name}</span>
                    </div>
                    <div className="meta-item">
                        <label>Responsável</label>
                        <span>{report.supervisorId || "—"}</span>
                    </div>
                    <div className="meta-item">
                        <label>Status</label>
                        <span>{STATUS_LABELS[report.status]}</span>
                    </div>
                </div>

                {/* Workforce */}
                <div className="section">
                    <div className="section-title">Efetivo</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Função</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.workforce.length === 0 ? (
                                <tr>
                                    <td colSpan={2} style={{ textAlign: 'center', color: '#888' }}>
                                        Nenhum efetivo registrado
                                    </td>
                                </tr>
                            ) : (
                                report.workforce.map(w => (
                                    <tr key={w.id}>
                                        <td>{w.role}</td>
                                        <td style={{ textAlign: 'center' }}>{w.count}</td>
                                    </tr>
                                ))
                            )}
                            <tr className="total-row">
                                <td>TOTAL</td>
                                <td style={{ textAlign: 'center' }}>{totalWorkers}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Activities */}
                <div className="section">
                    <div className="section-title">Atividades Executadas</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Atividade</th>
                                <th style={{ width: '120px' }}>Local</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>% Concluído</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.activities.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                                        Nenhuma atividade registrada
                                    </td>
                                </tr>
                            ) : (
                                report.activities.map(a => (
                                    <tr key={a.id}>
                                        <td>{a.description}</td>
                                        <td>{a.location || "—"}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="progress-bar">
                                                <span
                                                    className="progress-fill"
                                                    style={{ width: `${toNumber(a.percentDone)}%` }}
                                                />
                                            </span>
                                            {toNumber(a.percentDone)}%
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Occurrences */}
                {report.occurrences && (
                    <div className="section">
                        <div className="section-title">Ocorrências</div>
                        <div className="observations">{report.occurrences}</div>
                    </div>
                )}

                {/* Notes */}
                {report.notes && (
                    <div className="section">
                        <div className="section-title">Observações Gerais</div>
                        <div className="observations">{report.notes}</div>
                    </div>
                )}

                {/* Signatures */}
                <div className="signatures">
                    <div>
                        <div style={{ height: '50px' }} />
                        <div className="signature-line">
                            Responsável Técnico
                            {report.supervisorId && (
                                <div style={{ fontWeight: 'bold', marginTop: '2px' }}>
                                    {report.supervisorId}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div style={{ height: '50px' }} />
                        <div className="signature-line">
                            Fiscal da Obra
                        </div>
                    </div>
                </div>
            </body>
        </html>
    )
}

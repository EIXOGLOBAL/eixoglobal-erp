import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Cloud, Thermometer, User, Printer } from "lucide-react"
import { getDailyReportById } from "@/app/actions/daily-report-actions"
import { WorkforceEditor } from "@/components/rdo/workforce-editor"
import { ActivitiesEditor } from "@/components/rdo/activities-editor"
import { DailyReportDialog } from "@/components/rdo/daily-report-dialog"
import { prisma } from "@/lib/prisma"
import { toNumber } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

const WEATHER_LABELS: Record<string, string> = {
    SUNNY: "Ensolarado",
    CLOUDY: "Nublado",
    RAINY: "Chuvoso",
    STORMY: "Tempestuoso",
    WINDY: "Ventoso",
}

const WEATHER_ICONS: Record<string, string> = {
    SUNNY: "☀️",
    CLOUDY: "⛅",
    RAINY: "🌧️",
    STORMY: "⛈️",
    WINDY: "💨",
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    SUBMITTED: "Submetido",
    APPROVED: "Aprovado",
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-blue-100 text-blue-800",
    APPROVED: "bg-green-100 text-green-800",
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function RdoDetailPage({ params }: PageProps) {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const { id } = await params

    const [report, projects] = await Promise.all([
        getDailyReportById(id),
        prisma.project.findMany({
            where: { companyId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
    ])

    if (!report) notFound()

    const fmtDate = (d: Date) => new Date(d).toLocaleDateString('pt-BR')

    const totalWorkers = report.workforce.reduce((sum, w) => sum + w.count, 0)

    // Converter Decimal para number para Client Components
    const serializedReport = {
        ...report,
        temperature: report.temperature !== null ? toNumber(report.temperature) : null,
        activities: report.activities.map(a => ({
            ...a,
            percentDone: toNumber(a.percentDone),
        })),
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/rdo">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold">
                                RDO — {fmtDate(report.date)}
                            </h2>
                            <Badge className={STATUS_COLORS[report.status]}>
                                {STATUS_LABELS[report.status]}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                            {report.project.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {report.status === 'DRAFT' && (
                        <DailyReportDialog
                            companyId={companyId}
                            projects={projects}
                            report={{
                                id: report.id,
                                projectId: report.projectId,
                                date: report.date,
                                weather: report.weather,
                                temperature: report.temperature !== null ? toNumber(report.temperature) : null,
                                notes: report.notes,
                                occurrences: report.occurrences,
                                supervisorId: report.supervisorId,
                            }}
                            trigger={
                                <Button variant="outline" size="sm">
                                    Editar RDO
                                </Button>
                            }
                        />
                    )}
                    <Link href={`/rdo/${id}/print`} target="_blank">
                        <Button variant="outline" size="sm">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clima</CardTitle>
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">
                            {WEATHER_ICONS[report.weather]} {WEATHER_LABELS[report.weather]}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Temperatura</CardTitle>
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">
                            {report.temperature != null ? `${report.temperature}°C` : "—"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Responsável</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">
                            {report.supervisorId || "—"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="workforce">
                <TabsList>
                    <TabsTrigger value="workforce">
                        Efetivo ({totalWorkers} pessoas)
                    </TabsTrigger>
                    <TabsTrigger value="activities">
                        Atividades ({report.activities.length})
                    </TabsTrigger>
                    <TabsTrigger value="observations">
                        Observações
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="workforce" className="mt-4">
                    <WorkforceEditor
                        reportId={report.id}
                        workers={report.workforce}
                        reportStatus={report.status}
                    />
                </TabsContent>

                <TabsContent value="activities" className="mt-4">
                    <ActivitiesEditor
                        reportId={report.id}
                        activities={serializedReport.activities}
                        reportStatus={report.status}
                    />
                </TabsContent>

                <TabsContent value="observations" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Ocorrências</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {report.occurrences ? (
                                    <p className="text-sm whitespace-pre-wrap">{report.occurrences}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma ocorrência registrada.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Observações Gerais</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {report.notes ? (
                                    <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma observação registrada.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

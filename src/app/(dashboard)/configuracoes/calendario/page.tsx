import { requireAdmin } from "@/lib/route-guard"
import { getWorkCalendars } from "@/app/actions/work-calendar-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, CalendarCheck, CalendarClock } from "lucide-react"
import { CalendarTable } from "@/components/configuracoes/calendar-table"
import { CalendarDialog } from "@/components/configuracoes/calendar-dialog"

export const dynamic = 'force-dynamic'

const WEEKDAY_LABELS: Record<string, string> = {
    monday: "Seg",
    tuesday: "Ter",
    wednesday: "Qua",
    thursday: "Qui",
    friday: "Sex",
    saturday: "Sab",
    sunday: "Dom",
}

export default async function CalendarioPage() {
    const session = await requireAdmin()
    const companyId = session.user?.companyId
    if (!companyId) {
        return (
            <div className="flex-1 p-8">
                <p className="text-muted-foreground">Nenhuma empresa vinculada ao usuario.</p>
            </div>
        )
    }

    const result = await getWorkCalendars(companyId)
    const calendars = result.data ?? []

    // KPIs
    const activeCount = calendars.filter((c: any) => c.isActive).length
    const allHolidays = calendars.flatMap((c: any) => c.holidays ?? [])
    const totalHolidays = allHolidays.length

    // Proximo feriado
    const now = new Date()
    const upcomingHolidays = allHolidays
        .filter((h: any) => new Date(h.date) >= now)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const nextHoliday = upcomingHolidays[0] ?? null

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Calendario de Trabalho</h2>
                    <p className="text-muted-foreground">
                        Gerencie jornadas de trabalho, dias uteis e feriados
                    </p>
                </div>
                <CalendarDialog companyId={companyId} />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Calendarios Ativos</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                        <p className="text-xs text-muted-foreground">de {calendars.length} calendarios cadastrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Feriados Cadastrados</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHolidays}</div>
                        <p className="text-xs text-muted-foreground">em todos os calendarios</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proximo Feriado</CardTitle>
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {nextHoliday ? (
                            <>
                                <div className="text-lg font-bold">{nextHoliday.name}</div>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(nextHoliday.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        timeZone: 'UTC',
                                    })}
                                </p>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">Nenhum feriado futuro cadastrado</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de calendarios */}
            {calendars.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12 text-muted-foreground">
                        Nenhum calendario de trabalho cadastrado. Crie o primeiro calendario.
                    </CardContent>
                </Card>
            ) : (
                <CalendarTable
                    calendars={calendars.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        description: c.description,
                        hoursPerDay: Number(c.hoursPerDay),
                        isActive: c.isActive,
                        monday: c.monday,
                        tuesday: c.tuesday,
                        wednesday: c.wednesday,
                        thursday: c.thursday,
                        friday: c.friday,
                        saturday: c.saturday,
                        sunday: c.sunday,
                        holidayCount: c._count?.holidays ?? 0,
                        holidays: (c.holidays ?? []).map((h: any) => ({
                            id: h.id,
                            name: h.name,
                            date: h.date instanceof Date ? h.date.toISOString() : h.date,
                            type: h.type,
                            recurring: h.recurring,
                        })),
                    }))}
                    companyId={companyId}
                    weekdayLabels={WEEKDAY_LABELS}
                />
            )}
        </div>
    )
}

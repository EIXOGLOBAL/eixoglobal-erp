'use client'

import { useState } from "react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { deleteWorkCalendar, removeHoliday } from "@/app/actions/work-calendar-actions"
import { CalendarDialog, type CalendarFormData } from "@/components/configuracoes/calendar-dialog"
import { HolidayDialog } from "@/components/configuracoes/holiday-dialog"
import { Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react"

interface HolidayData {
    id: string
    name: string
    date: string
    type: string
    recurring: boolean
}

interface CalendarData {
    id: string
    name: string
    description: string | null
    hoursPerDay: number
    isActive: boolean
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
    holidayCount: number
    holidays: HolidayData[]
}

interface CalendarTableProps {
    calendars: CalendarData[]
    companyId: string
    weekdayLabels: Record<string, string>
}

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
    NACIONAL: "Nacional",
    ESTADUAL: "Estadual",
    MUNICIPAL: "Municipal",
    PONTE: "Ponte",
}

const HOLIDAY_TYPE_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    NACIONAL: "default",
    ESTADUAL: "secondary",
    MUNICIPAL: "outline",
    PONTE: "destructive",
}

function getWorkingDays(calendar: CalendarData, labels: Record<string, string>): string {
    const days: string[] = []
    if (calendar.monday) days.push(labels.monday)
    if (calendar.tuesday) days.push(labels.tuesday)
    if (calendar.wednesday) days.push(labels.wednesday)
    if (calendar.thursday) days.push(labels.thursday)
    if (calendar.friday) days.push(labels.friday)
    if (calendar.saturday) days.push(labels.saturday)
    if (calendar.sunday) days.push(labels.sunday)
    return days.join(", ")
}

function DeleteCalendarButton({ id, name }: { id: string; name: string }) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    async function handleDelete() {
        if (!confirm(`Deseja excluir o calendario "${name}"? Todos os feriados vinculados serao removidos.`)) return
        setLoading(true)
        try {
            const result = await deleteWorkCalendar(id)
            if (result.success) {
                toast({ title: "Calendario excluido", description: `"${name}" foi excluido com sucesso.` })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro inesperado", description: "Tente novamente." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

function DeleteHolidayButton({ calendarId, holidayId, name }: { calendarId: string; holidayId: string; name: string }) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    async function handleDelete() {
        if (!confirm(`Deseja remover o feriado "${name}"?`)) return
        setLoading(true)
        try {
            const result = await removeHoliday(calendarId, holidayId)
            if (result.success) {
                toast({ title: "Feriado removido", description: `"${name}" foi removido com sucesso.` })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro inesperado", description: "Tente novamente." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading} aria-label="Excluir">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

export function CalendarTable({ calendars, companyId, weekdayLabels }: CalendarTableProps) {
    const [expandedCalendars, setExpandedCalendars] = useState<Record<string, boolean>>({})

    const toggleExpanded = (id: string) => {
        setExpandedCalendars(prev => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <div className="space-y-4">
            {calendars.map((calendar) => {
                const isExpanded = expandedCalendars[calendar.id] ?? false
                const workingDaysCount = [
                    calendar.monday, calendar.tuesday, calendar.wednesday,
                    calendar.thursday, calendar.friday, calendar.saturday, calendar.sunday,
                ].filter(Boolean).length

                return (
                    <Card key={calendar.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{calendar.name}</CardTitle>
                                        <Badge variant={calendar.isActive ? "default" : "secondary"}>
                                            {calendar.isActive ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="mt-1">
                                        {calendar.hoursPerDay}h/dia | {workingDaysCount} dias uteis ({getWorkingDays(calendar, weekdayLabels)}) | {calendar.holidayCount} feriado{calendar.holidayCount !== 1 ? 's' : ''}
                                        {calendar.description && ` — ${calendar.description}`}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CalendarDialog
                                        companyId={companyId}
                                        calendar={calendar}
                                        trigger={
                                            <Button size="sm" variant="outline">Editar</Button>
                                        }
                                    />
                                    <DeleteCalendarButton id={calendar.id} name={calendar.name} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Toggle feriados */}
                            <div className="flex items-center justify-between mb-3">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleExpanded(calendar.id)}
                                    className="text-muted-foreground"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="mr-1 h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="mr-1 h-4 w-4" />
                                    )}
                                    Feriados ({calendar.holidayCount})
                                </Button>
                                <HolidayDialog calendarId={calendar.id} />
                            </div>

                            {isExpanded && (
                                <>
                                    {calendar.holidays.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Nome</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Recorrente</TableHead>
                                                    <TableHead className="w-[60px]">Acoes</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {calendar.holidays.map((holiday) => (
                                                    <TableRow key={holiday.id}>
                                                        <TableCell>
                                                            {new Date(holiday.date).toLocaleDateString('pt-BR', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                timeZone: 'UTC',
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{holiday.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={HOLIDAY_TYPE_COLORS[holiday.type] || "secondary"}>
                                                                {HOLIDAY_TYPE_LABELS[holiday.type] || holiday.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {holiday.recurring ? "Sim" : "Nao"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <DeleteHolidayButton
                                                                calendarId={calendar.id}
                                                                holidayId={holiday.id}
                                                                name={holiday.name}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            Nenhum feriado cadastrado neste calendario.
                                        </p>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

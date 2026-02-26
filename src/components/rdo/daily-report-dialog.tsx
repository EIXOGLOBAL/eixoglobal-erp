'use client'

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HolidayDatePicker } from "@/components/ui/holiday-date-picker"
import { useToast } from "@/hooks/use-toast"
import { createDailyReport, updateDailyReport } from "@/app/actions/daily-report-actions"
import { Plus, Loader2 } from "lucide-react"
import { WeatherDisplay } from "@/components/ui/weather-display"
import { WeatherData, wmoCodeToWeatherCondition } from "@/lib/weather"

type WeatherCondition = "SUNNY" | "CLOUDY" | "RAINY" | "STORMY" | "WINDY"

const WEATHER_OPTIONS: { value: WeatherCondition; label: string }[] = [
    { value: "SUNNY", label: "Ensolarado ☀️" },
    { value: "CLOUDY", label: "Nublado ⛅" },
    { value: "RAINY", label: "Chuvoso 🌧️" },
    { value: "STORMY", label: "Tempestuoso ⛈️" },
    { value: "WINDY", label: "Ventoso 💨" },
]

const formSchema = z.object({
    projectId: z.string().min(1, "Projeto é obrigatório"),
    date: z.string().min(1, "Data é obrigatória"),
    weather: z.enum(["SUNNY", "CLOUDY", "RAINY", "STORMY", "WINDY"]),
    temperature: z.coerce.number().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    occurrences: z.string().optional().or(z.literal("")),
    supervisorId: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

interface Project {
    id: string
    name: string
    latitude?: number | null
    longitude?: number | null
}

interface ReportData {
    id: string
    projectId: string
    date: Date
    weather: string
    temperature?: number | null
    notes?: string | null
    occurrences?: string | null
    supervisorId?: string | null
}

interface DailyReportDialogProps {
    companyId: string
    projects: Project[]
    report?: ReportData
    trigger?: React.ReactNode
}

export function DailyReportDialog({ companyId, projects, report, trigger }: DailyReportDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const toDateInputValue = (d?: Date | null) => {
        if (!d) return ""
        const dt = new Date(d)
        return dt.toISOString().split('T')[0]
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            projectId: report?.projectId || "",
            date: toDateInputValue(report?.date),
            weather: (report?.weather as WeatherCondition) || "SUNNY",
            temperature: report?.temperature ?? "",
            notes: report?.notes || "",
            occurrences: report?.occurrences || "",
            supervisorId: report?.supervisorId || "",
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                projectId: report?.projectId || "",
                date: toDateInputValue(report?.date),
                weather: (report?.weather as WeatherCondition) || "SUNNY",
                temperature: report?.temperature ?? "",
                notes: report?.notes || "",
                occurrences: report?.occurrences || "",
                supervisorId: report?.supervisorId || "",
            })
        }
    }, [open, report, form])

    // Watch project and date for weather fetching
    const watchedProjectId = form.watch("projectId")
    const watchedDate = form.watch("date")

    const selectedProject = projects.find(p => p.id === watchedProjectId)
    const hasCoordinates = !!(selectedProject?.latitude && selectedProject?.longitude)

    const handleWeatherLoaded = useCallback((weather: WeatherData) => {
        // Auto-populate temperature (average of min/max) if not already set by user
        const currentTemp = form.getValues("temperature")
        if (currentTemp === "" || currentTemp === undefined) {
            const avgTemp = Math.round((weather.tempMax + weather.tempMin) / 2)
            form.setValue("temperature", avgTemp)
        }
        // Auto-populate weather condition from WMO code
        const condition = wmoCodeToWeatherCondition(weather.conditionCode) as WeatherCondition
        form.setValue("weather", condition)
    }, [form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const data = {
                projectId: values.projectId,
                date: values.date,
                weather: values.weather,
                temperature: values.temperature !== "" && values.temperature !== undefined
                    ? Number(values.temperature)
                    : null,
                notes: (values.notes as string) || null,
                occurrences: (values.occurrences as string) || null,
                supervisorId: (values.supervisorId as string) || null,
            }

            const result = report
                ? await updateDailyReport(report.id, data)
                : await createDailyReport(data, companyId)

            if (result.success) {
                toast({
                    title: report ? "RDO Atualizado" : "RDO Criado",
                    description: report
                        ? "O RDO foi atualizado com sucesso."
                        : "Novo RDO criado com sucesso.",
                })
                setOpen(false)
                form.reset()
                window.location.reload()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Erro inesperado",
                description: "Tente novamente mais tarde.",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo RDO
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{report ? 'Editar RDO' : 'Novo Relatório Diário de Obra'}</DialogTitle>
                    <DialogDescription>
                        {report
                            ? 'Atualize as informações do relatório diário.'
                            : 'Preencha os dados para criar um novo RDO.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projeto *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um projeto..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data *</FormLabel>
                                        <FormControl>
                                            <HolidayDatePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                disabled={field.disabled}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Automatic weather info from Open-Meteo */}
                        {watchedProjectId && watchedDate && (
                            <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Clima do dia (Open-Meteo)</p>
                                {hasCoordinates ? (
                                    <WeatherDisplay
                                        date={watchedDate}
                                        latitude={selectedProject!.latitude!}
                                        longitude={selectedProject!.longitude!}
                                        onWeatherLoaded={handleWeatherLoaded}
                                    />
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        Configure latitude/longitude no cadastro do projeto para ver o clima automaticamente.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="weather"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condição Climática</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o clima..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {WEATHER_OPTIONS.map(w => (
                                                    <SelectItem key={w.value} value={w.value}>
                                                        {w.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="temperature"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Temperatura (°C)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="Ex: 28"
                                                {...field}
                                                value={field.value === null ? "" : field.value}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="supervisorId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Responsável / Fiscal</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Nome do responsável técnico..."
                                            {...field}
                                            value={field.value as string || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="occurrences"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ocorrências</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={3}
                                            placeholder="Registre ocorrências relevantes do dia..."
                                            {...field}
                                            value={field.value as string || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações Gerais</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={3}
                                            placeholder="Observações adicionais..."
                                            {...field}
                                            value={field.value as string || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {report ? 'Atualizar' : 'Criar'} RDO
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

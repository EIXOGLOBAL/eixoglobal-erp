'use client'
import { useRouter } from 'next/navigation'

import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { createEmployee, updateEmployee } from "@/app/actions/employee-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Loader2, Clock, X } from "lucide-react"
import { CpfInput } from "@/components/ui/cpf-input"

const formSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    jobTitle: z.string().min(2, "Cargo é obrigatório"),
    document: z.string().optional().or(z.literal('')),
    skills: z.string().optional(),
    costPerHour: z.coerce.number().min(0).optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).optional(),
    salaryGradeId: z.string().optional().nullable(),
    admissionDate: z.string().optional().nullable(),
    leaveDate: z.string().optional().nullable(),
    terminationDate: z.string().optional().nullable(),
    monthlySalary: z.coerce.number().min(0).optional().nullable(),
    hoursPerMonth: z.coerce.number().min(1).max(400).default(220),
    overtimeRates: z.string().default("[]"),
    housed: z.boolean().default(false),
    valeTransporte: z.boolean().default(false),
    vtDailyValue: z.coerce.number().min(0).optional().nullable(),
    valeAlimentacao: z.coerce.number().min(0).optional().nullable(),
    planoSaude: z.coerce.number().min(0).optional().nullable(),
    outrosBeneficios: z.coerce.number().min(0).optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface SalaryGradeOption {
    id: string
    jobTitle: string
    level: string | null
    costPerHour: number
    baseSalary: number
}

interface EmployeeDialogProps {
    companyId: string
    employee?: any
    trigger?: React.ReactNode
    salaryGrades?: SalaryGradeOption[]
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function EmployeeDialog({
  companyId, employee, trigger, salaryGrades = [], open: controlledOpen, onOpenChange }: EmployeeDialogProps) {
  const router = useRouter()
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
    const { toast } = useToast()

    const [customOtInput, setCustomOtInput] = useState('')

    const buildDefaults = (emp?: any): FormValues => ({
        name: emp?.name || "",
        jobTitle: emp?.jobTitle || "",
        document: emp?.document || "",
        skills: emp?.skills || "[]",
        costPerHour: emp?.costPerHour != null ? Number(emp.costPerHour) : undefined,
        status: emp?.status || 'ACTIVE',
        salaryGradeId: emp?.salaryGradeId || null,
        admissionDate: emp?.admissionDate
            ? new Date(emp.admissionDate).toISOString().split('T')[0]
            : null,
        leaveDate: emp?.leaveDate
            ? new Date(emp.leaveDate).toISOString().split('T')[0]
            : null,
        terminationDate: emp?.terminationDate
            ? new Date(emp.terminationDate).toISOString().split('T')[0]
            : null,
        monthlySalary: emp?.monthlySalary != null ? Number(emp.monthlySalary) : null,
        hoursPerMonth: emp?.hoursPerMonth ?? 220,
        overtimeRates: emp?.overtimeRates ?? "[]",
        housed: emp?.housed ?? false,
        valeTransporte: emp?.valeTransporte ?? false,
        vtDailyValue: emp?.vtDailyValue != null ? Number(emp.vtDailyValue) : null,
        valeAlimentacao: emp?.valeAlimentacao != null ? Number(emp.valeAlimentacao) : null,
        planoSaude: emp?.planoSaude != null ? Number(emp.planoSaude) : null,
        outrosBeneficios: emp?.outrosBeneficios != null ? Number(emp.outrosBeneficios) : null,
    })

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: buildDefaults(employee),
    })

    const watchValeTransporte = form.watch("valeTransporte")
    const watchSalaryGradeId = form.watch("salaryGradeId")
    const watchMonthlySalary = form.watch("monthlySalary")
    const watchHoursPerMonth = form.watch("hoursPerMonth")
    const watchOvertimeRates = form.watch("overtimeRates")

    // Parse custom overtime rates
    const customOtRates: number[] = (() => {
        try { return JSON.parse(watchOvertimeRates || "[]") } catch { return [] }
    })()

    // Calculated hourly rate
    const calcHourlyRate = (watchMonthlySalary && watchHoursPerMonth)
        ? watchMonthlySalary / (watchHoursPerMonth || 220)
        : null

    const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    // Standard overtime percentages
    const STANDARD_OT = [50, 60, 70, 100]

    function addCustomOt() {
        const pct = parseInt(customOtInput)
        if (!pct || pct <= 0 || pct > 1000) return
        if (STANDARD_OT.includes(pct) || customOtRates.includes(pct)) return
        const updated = [...customOtRates, pct].sort((a, b) => a - b)
        form.setValue("overtimeRates", JSON.stringify(updated))
        setCustomOtInput('')
    }

    function removeCustomOt(pct: number) {
        const updated = customOtRates.filter(r => r !== pct)
        form.setValue("overtimeRates", JSON.stringify(updated))
    }

    // Auto-fill when grade is selected
    useEffect(() => {
        if (!watchSalaryGradeId) return
        const grade = salaryGrades.find(g => g.id === watchSalaryGradeId)
        if (grade) {
            form.setValue("jobTitle", grade.jobTitle)
            form.setValue("costPerHour", grade.costPerHour)
            form.setValue("monthlySalary", grade.baseSalary)
        }
    }, [watchSalaryGradeId, salaryGrades, form])

    // Auto-calc costPerHour from monthlySalary / hoursPerMonth
    useEffect(() => {
        if (watchSalaryGradeId) return // Grade already manages costPerHour
        if (watchMonthlySalary && watchHoursPerMonth) {
            const hourly = watchMonthlySalary / watchHoursPerMonth
            form.setValue("costPerHour", Math.round(hourly * 100) / 100)
        }
    }, [watchMonthlySalary, watchHoursPerMonth, watchSalaryGradeId, form])

    useEffect(() => {
        if (open && employee) {
            form.reset(buildDefaults(employee))
        } else if (open && !employee) {
            form.reset(buildDefaults())
        }
    }, [open, employee]) // eslint-disable-line react-hooks/exhaustive-deps

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const data = {
                ...values,
                skills: values.skills || "[]",
                document: values.document || null,
                costPerHour: values.costPerHour ?? null,
                salaryGradeId: values.salaryGradeId || null,
                companyId,
            }

            const result = employee
                ? await updateEmployee(employee.id, data)
                : await createEmployee(data)

            if (result.success) {
                toast({
                    title: employee ? "Funcionário Atualizado" : "Funcionário Cadastrado",
                    description: `${values.name} foi ${employee ? 'atualizado' : 'cadastrado'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
                router.refresh()
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
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Funcionário
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{employee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
                    <DialogDescription>
                        {employee ? 'Atualize as informações do funcionário.' : 'Cadastre um novo funcionário da equipe.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Dados Básicos */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Básicos</h3>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo *</FormLabel>
                                        <FormControl>
                                            <Input autoFocus placeholder="Ex: João da Silva" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="jobTitle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cargo *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Pedreiro, Engenheiro" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="document"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF / Documento</FormLabel>
                                            <FormControl>
                                                <CpfInput
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                                                    <SelectItem value="ON_LEAVE">Afastado</SelectItem>
                                                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                                                    <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="skills"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Habilidades</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ex: Alvenaria, Elétrica"
                                                    value={
                                                        (() => {
                                                            try {
                                                                const arr = JSON.parse(field.value || '[]')
                                                                return Array.isArray(arr) ? arr.join(', ') : field.value
                                                            } catch {
                                                                return field.value
                                                            }
                                                        })()
                                                    }
                                                    onChange={(e) => {
                                                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                        field.onChange(JSON.stringify(arr))
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Dados Contratuais */}
                        <div className="space-y-4 pt-2 border-t">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Dados Contratuais</h3>

                            {salaryGrades.length > 0 && (
                                <FormField
                                    control={form.control}
                                    name="salaryGradeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Grade Salarial</FormLabel>
                                            <Select
                                                onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                                                value={field.value || "__none__"}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecionar grade salarial" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Sem grade vinculado</SelectItem>
                                                    {salaryGrades.map(g => (
                                                        <SelectItem key={g.id} value={g.id}>
                                                            {g.jobTitle}{g.level ? ` – ${g.level}` : ''} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.costPerHour)}/h)
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="admissionDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Admissão</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="leaveDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Afastamento</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="terminationDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Demissão</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Remuneração */}
                        <div className="space-y-4 pt-2 border-t">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Remuneração</h3>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="monthlySalary"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Salário Mensal (R$)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value ?? undefined}
                                                    onChange={(v) => field.onChange(v || null)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="hoursPerMonth"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Horas/Mês</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={400}
                                                    placeholder="220"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="costPerHour"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor/Hora (R$/h)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value ?? undefined}
                                                    onChange={(v) => field.onChange(v || undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Overtime Calculator Panel */}
                            {calcHourlyRate && (
                                <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Clock className="h-4 w-4 text-orange-500" />
                                        Horas Extras — Valor/hora: {formatBRL(calcHourlyRate)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {STANDARD_OT.map(pct => (
                                            <div key={pct} className="flex flex-col items-center rounded border bg-background p-2 text-center">
                                                <span className="text-xs text-muted-foreground">+{pct}%</span>
                                                <span className="text-sm font-semibold">
                                                    {formatBRL(calcHourlyRate * (1 + pct / 100))}
                                                </span>
                                            </div>
                                        ))}
                                        {customOtRates.map(pct => (
                                            <div key={pct} className="flex flex-col items-center rounded border border-orange-200 bg-orange-50 p-2 text-center relative">
                                                <button
                                                    type="button"
                                                    onClick={() => removeCustomOt(pct)}
                                                    className="absolute top-0.5 right-0.5 text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                                <span className="text-xs text-orange-600">+{pct}%</span>
                                                <span className="text-sm font-semibold text-orange-700">
                                                    {formatBRL(calcHourlyRate * (1 + pct / 100))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Percentual personalizado (ex: 80)"
                                            value={customOtInput}
                                            onChange={e => setCustomOtInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomOt())}
                                            className="h-8 text-sm"
                                            min={1}
                                            max={1000}
                                        />
                                        <Button type="button" size="sm" variant="outline" onClick={addCustomOt} className="h-8 text-xs whitespace-nowrap">
                                            + Adicionar %
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Benefícios */}
                        <div className="space-y-4 pt-2 border-t">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Benefícios</h3>

                            <FormField
                                control={form.control}
                                name="valeTransporte"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer font-normal">Vale Transporte</FormLabel>
                                    </FormItem>
                                )}
                            />

                            {watchValeTransporte && (
                                <FormField
                                    control={form.control}
                                    name="vtDailyValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor Diário do VT (R$)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value ?? undefined}
                                                    onChange={(v) => field.onChange(v || null)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="valeAlimentacao"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vale Alimentação (R$/mês)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value ?? undefined}
                                                    onChange={(v) => field.onChange(v || null)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="planoSaude"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Plano de Saúde (R$/mês)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value ?? undefined}
                                                    onChange={(v) => field.onChange(v || null)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="outrosBeneficios"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Outros Benefícios (R$/mês)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value ?? undefined}
                                                    onChange={(v) => field.onChange(v || null)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Outras Informações */}
                        <div className="space-y-4 pt-2 border-t">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Outras Informações</h3>

                            <FormField
                                control={form.control}
                                name="housed"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer font-normal">Alojado (funcionário reside no canteiro)</FormLabel>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {employee ? 'Atualizar' : 'Cadastrar'} Funcionário
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Loader2,
    Save,
    Trash2,
    Building2,
    Percent,
    Star,
} from "lucide-react"
import { BDICalculator } from "./bdi-calculator"
import { createBDIConfig, updateBDIConfig, deleteBDIConfig, type BDIConfigInput } from "@/app/actions/bdi-config-actions"

const formSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    administracaoCentral: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    seguroGarantia: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    risco: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    despesasFinanceiras: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    lucro: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    iss: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    pis: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    cofins: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    irpj: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    csll: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99.99, "Valor entre 0 e 99.99"),
    isDefault: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface BDIConfigData {
    id: string
    name: string
    percentage: number
    administracaoCentral: number
    seguroGarantia: number
    risco: number
    despesasFinanceiras: number
    lucro: number
    iss: number
    pis: number
    cofins: number
    irpj: number
    csll: number
    isDefault: boolean
}

interface BDIFormProps {
    companyId: string
    config?: BDIConfigData | null
}

export function BDIForm({ companyId, config }: BDIFormProps) {
    const { toast } = useToast()
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const isEdit = !!config

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: config?.name ?? "",
            administracaoCentral: config?.administracaoCentral?.toString() ?? "4.00",
            seguroGarantia: config?.seguroGarantia?.toString() ?? "0.80",
            risco: config?.risco?.toString() ?? "1.27",
            despesasFinanceiras: config?.despesasFinanceiras?.toString() ?? "1.23",
            lucro: config?.lucro?.toString() ?? "7.40",
            iss: config?.iss?.toString() ?? "2.00",
            pis: config?.pis?.toString() ?? "0.65",
            cofins: config?.cofins?.toString() ?? "3.00",
            irpj: config?.irpj?.toString() ?? "1.20",
            csll: config?.csll?.toString() ?? "1.08",
            isDefault: config?.isDefault ?? true,
        },
    })

    const watchedValues = form.watch()
    const calculatorValues = {
        administracaoCentral: Number(watchedValues.administracaoCentral) || 0,
        seguroGarantia: Number(watchedValues.seguroGarantia) || 0,
        risco: Number(watchedValues.risco) || 0,
        despesasFinanceiras: Number(watchedValues.despesasFinanceiras) || 0,
        lucro: Number(watchedValues.lucro) || 0,
        iss: Number(watchedValues.iss) || 0,
        pis: Number(watchedValues.pis) || 0,
        cofins: Number(watchedValues.cofins) || 0,
        irpj: Number(watchedValues.irpj) || 0,
        csll: Number(watchedValues.csll) || 0,
    }

    async function onSubmit(values: FormValues) {
        setSaving(true)
        try {
            const data: BDIConfigInput = {
                name: values.name,
                companyId,
                administracaoCentral: Number(values.administracaoCentral),
                seguroGarantia: Number(values.seguroGarantia),
                risco: Number(values.risco),
                despesasFinanceiras: Number(values.despesasFinanceiras),
                lucro: Number(values.lucro),
                iss: Number(values.iss),
                pis: Number(values.pis),
                cofins: Number(values.cofins),
                irpj: Number(values.irpj),
                csll: Number(values.csll),
                isDefault: values.isDefault,
            }

            const result = isEdit
                ? await updateBDIConfig(config!.id, data)
                : await createBDIConfig(data)

            if (result.success) {
                toast({
                    title: isEdit ? "BDI atualizado!" : "BDI criado!",
                    description: `Configuração "${values.name}" salva com sucesso.`,
                })
                router.refresh()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!config) return
        setDeleting(true)
        try {
            const result = await deleteBDIConfig(config.id)
            if (result.success) {
                toast({ title: "Configuração BDI excluída." })
                router.refresh()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Formulário */}
            <div className="lg:col-span-2">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Nome e Default */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Identificação
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome da Configuração *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: BDI Padrão, BDI Obras Públicas" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Nome identificador para esta configuração de BDI
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="isDefault"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-3 rounded-md border p-3">
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="flex-1">
                                                <FormLabel className="flex items-center gap-1.5">
                                                    <Star className="h-3.5 w-3.5 text-amber-500" />
                                                    Configuração Padrão
                                                </FormLabel>
                                                <FormDescription className="text-xs">
                                                    Será usada automaticamente em novos orçamentos
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Custos Indiretos */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Percent className="h-4 w-4" />
                                    Custos Indiretos
                                </CardTitle>
                                <CardDescription>
                                    Taxas que compõem o fator de custos indiretos da obra
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <FormField
                                        control={form.control}
                                        name="administracaoCentral"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Administração Central (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="4.00" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Ref. TCU: 3,00% a 5,50%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="seguroGarantia"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Seguro e Garantia (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="0.80" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Ref. TCU: 0,56% a 0,97%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="risco"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Risco (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="1.27" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Ref. TCU: 0,97% a 1,27%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Despesas Financeiras e Lucro */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Despesas Financeiras e Lucro</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="despesasFinanceiras"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Despesas Financeiras (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="1.23" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Ref. TCU: 0,59% a 1,39%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lucro"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Lucro (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="7.40" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Ref. TCU: 6,16% a 8,96%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tributos */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Tributos</CardTitle>
                                <CardDescription>
                                    Tributos incidentes sobre o faturamento. Afetam o denominador da formula BDI.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                    <FormField
                                        control={form.control}
                                        name="iss"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ISS (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="2.00" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">2% a 5%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pis"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PIS (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="0.65" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">0,65%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="cofins"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>COFINS (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="3.00" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">3,00%</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="irpj"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>IRPJ (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="1.20" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Lucro presumido</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="csll"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CSLL (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" min="0" max="99.99" placeholder="1.08" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Lucro presumido</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <div>
                                {isEdit && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button type="button" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Excluir
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Excluir Configuração BDI?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    A configuração "{config?.name}" será excluída permanentemente.
                                                    Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDelete}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                    Excluir
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                {isEdit ? "Salvar Alterações" : "Criar Configuração"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>

            {/* Calculator Preview - sticky sidebar */}
            <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
                <BDICalculator {...calculatorValues} />

                {isEdit && config && (
                    <Card>
                        <CardContent className="pt-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ID</span>
                                    <span className="font-mono text-xs">{config.id.slice(0, 8)}...</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    {config.isDefault ? (
                                        <Badge variant="default" className="text-xs">Padrão</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-xs">Alternativo</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

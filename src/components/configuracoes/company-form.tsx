'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Building2, MapPin, Phone, FileText, ImageIcon, Camera, Trash2 } from 'lucide-react'
import { updateCompanySettings, uploadCompanyLogo, removeCompanyLogo } from '@/app/actions/company-actions'
import { CnpjInput, type CnpjData } from '@/components/ui/cnpj-input'
import { CepInput } from '@/components/ui/cep-input'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const companySettingsSchema = z.object({
    name: z.string().min(3, 'Razao Social deve ter no minimo 3 caracteres'),
    tradeName: z.string().optional(),
    cnpj: z.string().min(14, 'CNPJ invalido'),
    email: z.string().email('Email invalido').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companySettingsSchema>

// ---------------------------------------------------------------------------
// UFs brasileiras
// ---------------------------------------------------------------------------
const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CompanyFormProps {
    company: {
        id: string
        name: string
        tradeName: string | null
        cnpj: string
        email: string | null
        phone: string | null
        address: string | null
        city: string | null
        state: string | null
        zipCode: string | null
        logoUrl: string | null
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CompanyForm({ company }: CompanyFormProps) {
    return (
        <div className="space-y-6">
            <LogoSection companyId={company.id} currentLogoUrl={company.logoUrl} companyName={company.name} />
            <DadosGeraisSection company={company} />
            <EnderecoSection company={company} />
            <ContatoSection company={company} />
        </div>
    )
}

// ---------------------------------------------------------------------------
// Secao: Logo
// ---------------------------------------------------------------------------
function LogoSection({ companyId, currentLogoUrl, companyName }: { companyId: string; currentLogoUrl: string | null; companyName: string }) {
    const { toast } = useToast()
    const [logoUrl, setLogoUrl] = useState(currentLogoUrl)
    const [uploading, setUploading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadCompanyLogo(formData)
        setUploading(false)
        if (result.success && result.logoUrl) {
            setLogoUrl(result.logoUrl + '?t=' + Date.now())
            toast({ title: 'Logo atualizado com sucesso!' })
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.error })
        }
        if (inputRef.current) inputRef.current.value = ''
    }

    async function handleRemove() {
        const result = await removeCompanyLogo()
        if (result.success) {
            setLogoUrl(null)
            toast({ title: 'Logo removido' })
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.error })
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Logo da Empresa
                </CardTitle>
                <CardDescription>
                    Imagem exibida no sistema e documentos. Formatos: JPG, PNG, WebP (max 2MB)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-border">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={companyName}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <Building2 className="h-10 w-10 text-muted-foreground" />
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            {uploading ? 'Enviando...' : logoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                        </Button>
                        {logoUrl && (
                            <Button variant="ghost" size="sm" onClick={handleRemove}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover Logo
                            </Button>
                        )}
                    </div>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </CardContent>
        </Card>
    )
}

// ---------------------------------------------------------------------------
// Secao: Dados Gerais
// ---------------------------------------------------------------------------
function DadosGeraisSection({ company }: CompanyFormProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companySettingsSchema),
        defaultValues: {
            name: company.name,
            tradeName: company.tradeName ?? '',
            cnpj: company.cnpj,
            email: company.email ?? '',
            phone: company.phone ?? '',
            address: company.address ?? '',
            city: company.city ?? '',
            state: company.state ?? '',
            zipCode: company.zipCode ?? '',
        },
    })

    function handleCnpjFill(data: CnpjData) {
        form.setValue('name', data.razaoSocial)
        form.setValue('tradeName', data.nomeFantasia)
        form.setValue('email', data.email)
        form.setValue('phone', data.phone)
        form.setValue('address', data.address)
        form.setValue('city', data.city)
        form.setValue('state', data.state)
        form.setValue('zipCode', data.zipCode)
    }

    async function onSubmit(values: CompanyFormValues) {
        setLoading(true)
        try {
            const result = await updateCompanySettings(values)
            if (result.success) {
                toast({ title: 'Dados da empresa atualizados com sucesso!' })
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados Gerais
                </CardTitle>
                <CardDescription>Razao social, nome fantasia e CNPJ da empresa</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="cnpj"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CNPJ</FormLabel>
                                    <FormControl>
                                        <CnpjInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            onDataFill={handleCnpjFill}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Razao Social</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome empresarial" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tradeName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Fantasia</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome fantasia" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Dados Gerais
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

// ---------------------------------------------------------------------------
// Secao: Endereco
// ---------------------------------------------------------------------------
function EnderecoSection({ company }: CompanyFormProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companySettingsSchema),
        defaultValues: {
            name: company.name,
            tradeName: company.tradeName ?? '',
            cnpj: company.cnpj,
            email: company.email ?? '',
            phone: company.phone ?? '',
            address: company.address ?? '',
            city: company.city ?? '',
            state: company.state ?? '',
            zipCode: company.zipCode ?? '',
        },
    })

    function handleCepFill(addr: { street: string; neighborhood: string; city: string; state: string }) {
        const fullAddress = [addr.street, addr.neighborhood].filter(Boolean).join(', ')
        form.setValue('address', fullAddress)
        form.setValue('city', addr.city)
        form.setValue('state', addr.state)
    }

    async function onSubmit(values: CompanyFormValues) {
        setLoading(true)
        try {
            const result = await updateCompanySettings(values)
            if (result.success) {
                toast({ title: 'Endereco atualizado com sucesso!' })
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Endereco
                </CardTitle>
                <CardDescription>Endereco principal da empresa</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="zipCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                            <CepInput
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onAddressFill={handleCepFill}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="md:col-span-2">
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Endereço</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Rua, número, complemento" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cidade</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Cidade" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="state"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado (UF)</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value ?? ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o estado" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ESTADOS_BR.map(uf => (
                                                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Endereco
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

// ---------------------------------------------------------------------------
// Secao: Contato
// ---------------------------------------------------------------------------
function ContatoSection({ company }: CompanyFormProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companySettingsSchema),
        defaultValues: {
            name: company.name,
            tradeName: company.tradeName ?? '',
            cnpj: company.cnpj,
            email: company.email ?? '',
            phone: company.phone ?? '',
            address: company.address ?? '',
            city: company.city ?? '',
            state: company.state ?? '',
            zipCode: company.zipCode ?? '',
        },
    })

    async function onSubmit(values: CompanyFormValues) {
        setLoading(true)
        try {
            const result = await updateCompanySettings(values)
            if (result.success) {
                toast({ title: 'Contato atualizado com sucesso!' })
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contato
                </CardTitle>
                <CardDescription>Email e telefone principal da empresa</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="contato@empresa.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(00) 00000-0000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Contato
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

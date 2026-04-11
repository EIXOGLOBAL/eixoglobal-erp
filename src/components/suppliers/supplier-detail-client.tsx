'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { CopyableValue } from "@/components/ui/copy-button"
import {
    ArrowLeft,
    Star,
    Users,
    FileText,
    DollarSign,
    ClipboardCheck,
    Plus,
    Trash2,
    Upload,
    Download,
    MapPin,
    Phone,
    Mail,
    Globe,
    Building2,
    Crown,
    Loader2,
    AlertTriangle,
    CheckCircle,
    Calendar,
} from "lucide-react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar,
} from "recharts"
import {
    addSupplierContact,
    removeSupplierContact,
    uploadSupplierDocument,
    evaluateSupplier,
} from "@/app/actions/supplier-actions"

import { formatDate } from "@/lib/formatters"
// ============================================================
// Types
// ============================================================

interface SupplierContact {
    id: string
    name: string
    role: string | null
    email: string | null
    phone: string | null
    isPrimary: boolean
    createdAt: string
}

interface SupplierDocument {
    id: string
    type: string
    filename: string
    filePath: string
    expiresAt: string | null
    uploadedAt: string
    uploadedBy: string
}

interface SupplierEvaluation {
    id: string
    score: number
    quality: number
    delivery: number
    price: number
    support: number
    comment: string | null
    createdAt: string
    evaluator: { id: string; name: string | null; email: string }
}

interface SupplierData {
    id: string
    name: string
    tradeName: string | null
    cnpj: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    category: string
    isActive: boolean
    notes: string | null
    rating: number | null
    paymentTermDays: number | null
    observations: string | null
    website: string | null
    contacts: SupplierContact[]
    documents: SupplierDocument[]
    evaluations: SupplierEvaluation[]
    _count: { fiscalNotes: number; purchaseOrders: number }
    financialSummary: {
        purchaseOrdersCount: number
        purchaseOrdersTotal: number
        financialRecordsCount: number
        totalPaid: number
    }
}

interface MonthlyData {
    month: string
    label: string
    total: number
}

interface FinancialRecord {
    id: string
    date: string
    description: string
    value: number
    status: string
    source: 'PO' | 'FR'
}

interface FinancialData {
    monthlyData: MonthlyData[]
    records: FinancialRecord[]
    totals: {
        totalPaid: number
        averageMonthly: number
        largestPurchase: number
    }
}

interface Props {
    supplier: SupplierData
    financialData: FinancialData | null
    companyId: string
}

// ============================================================
// Constants
// ============================================================

const CATEGORY_LABELS: Record<string, string> = {
    MATERIALS: "Materiais",
    SERVICES: "Servicos",
    UTILITIES: "Concessionarias",
    RENT: "Locacao",
    TRANSPORT: "Transportadora",
    TECHNOLOGY: "Tecnologia",
    OTHER: "Outros",
}

const DOC_TYPE_LABELS: Record<string, string> = {
    CONTRATO_SOCIAL: "Contrato Social",
    CARTAO_CNPJ: "Cartao CNPJ",
    CERTIDAO_NEGATIVA: "Certidao Negativa",
    CERTIDAO_FGTS: "Certidao FGTS",
    CERTIDAO_TRABALHISTA: "Certidao Trabalhista",
    APOLICE_SEGURO: "Apolice de Seguro",
    ALVARA: "Alvara",
    OUTROS: "Outros",
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING: "Pendente",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    ORDERED: "Pedido Enviado",
    PARTIALLY_RECEIVED: "Parcialmente Recebido",
    RECEIVED: "Recebido",
    CANCELLED: "Cancelado",
    PAID: "Pago",
    SCHEDULED: "Agendado",
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// ============================================================
// Sub-components
// ============================================================

function RatingStarsLarge({ rating, size = "lg" }: { rating: number | null; size?: "sm" | "lg" }) {
    const val = rating ?? 0
    const fullStars = Math.floor(val)
    const hasHalf = val - fullStars >= 0.5
    const starSize = size === "lg" ? "h-6 w-6" : "h-4 w-4"
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    className={`${starSize} ${
                        i < fullStars
                            ? "fill-yellow-400 text-yellow-400"
                            : i === fullStars && hasHalf
                              ? "fill-yellow-400/50 text-yellow-400"
                              : "text-gray-300"
                    }`}
                />
            ))}
            <span className={`${size === "lg" ? "text-2xl font-bold" : "text-sm"} ml-2`}>
                {rating !== null ? val.toFixed(1) : "N/A"}
            </span>
        </div>
    )
}

function DocStatusBadge({ expiresAt }: { expiresAt: string | null }) {
    if (!expiresAt) {
        return <Badge variant="outline">Sem validade</Badge>
    }
    const now = new Date()
    const expDate = new Date(expiresAt)
    const diffMs = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        return <Badge variant="destructive">Vencido ({Math.abs(diffDays)}d)</Badge>
    }
    if (diffDays <= 30) {
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Vence em {diffDays}d</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Valido ({diffDays}d)</Badge>
}

// ============================================================
// Main Component
// ============================================================

export function SupplierDetailClient({ supplier, financialData, companyId }: Props) {
    const router = useRouter()
    const { toast } = useToast()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/fornecedores')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
                        {supplier.isActive ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
                        ) : (
                            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Inativo</Badge>
                        )}
                    </div>
                    {supplier.tradeName && (
                        <p className="text-muted-foreground">{supplier.tradeName}</p>
                    )}
                </div>
                <RatingStarsLarge rating={supplier.rating} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="info" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="info">
                        <Building2 className="h-4 w-4 mr-2" />
                        Informações
                    </TabsTrigger>
                    <TabsTrigger value="docs">
                        <FileText className="h-4 w-4 mr-2" />
                        Documentos
                    </TabsTrigger>
                    <TabsTrigger value="financeiro">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Histórico Financeiro
                    </TabsTrigger>
                    <TabsTrigger value="avaliacoes">
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Avaliações
                    </TabsTrigger>
                </TabsList>

                {/* ======= TAB: Informacoes ======= */}
                <TabsContent value="info">
                    <TabInfo supplier={supplier} />
                </TabsContent>

                {/* ======= TAB: Documentos ======= */}
                <TabsContent value="docs">
                    <TabDocuments supplier={supplier} />
                </TabsContent>

                {/* ======= TAB: Historico Financeiro ======= */}
                <TabsContent value="financeiro">
                    <TabFinancial supplier={supplier} financialData={financialData} />
                </TabsContent>

                {/* ======= TAB: Avaliacoes ======= */}
                <TabsContent value="avaliacoes">
                    <TabEvaluations supplier={supplier} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ============================================================
// Tab: Informacoes
// ============================================================

function TabInfo({ supplier }: { supplier: SupplierData }) {
    const { toast } = useToast()
    const [addContactOpen, setAddContactOpen] = useState(false)
    const [contactName, setContactName] = useState("")
    const [contactRole, setContactRole] = useState("")
    const [contactEmail, setContactEmail] = useState("")
    const [contactPhone, setContactPhone] = useState("")
    const [contactPrimary, setContactPrimary] = useState(false)
    const [loading, setLoading] = useState(false)
    const [removingId, setRemovingId] = useState<string | null>(null)

    async function handleAddContact() {
        if (!contactName.trim()) {
            toast({ variant: "destructive", title: "Erro", description: "Nome do contato e obrigatorio" })
            return
        }
        setLoading(true)
        const result = await addSupplierContact(supplier.id, {
            name: contactName,
            role: contactRole || undefined,
            email: contactEmail || undefined,
            phone: contactPhone || undefined,
            isPrimary: contactPrimary,
        })
        setLoading(false)
        if (result.success) {
            toast({ title: "Contato adicionado!", description: `${contactName} foi adicionado com sucesso.` })
            setAddContactOpen(false)
            setContactName("")
            setContactRole("")
            setContactEmail("")
            setContactPhone("")
            setContactPrimary(false)
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    async function handleRemoveContact(contactId: string) {
        setRemovingId(contactId)
        const result = await removeSupplierContact(contactId)
        setRemovingId(null)
        if (result.success) {
            toast({ title: "Contato removido!" })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    return (
        <div className="grid grid-cols-3 gap-6">
            {/* Supplier Data */}
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Dados do Fornecedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground text-xs">Razao Social</Label>
                            <p className="font-medium">{supplier.name}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs">Nome Fantasia</Label>
                            <p className="font-medium">{supplier.tradeName || "\u2014"}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs">CNPJ / CPF</Label>
                            <p className="font-medium">{supplier.cnpj ? <CopyableValue value={supplier.cnpj} mono /> : "\u2014"}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs">Categoria</Label>
                            <p className="font-medium">
                                <Badge variant="outline">{CATEGORY_LABELS[supplier.category] ?? supplier.category}</Badge>
                            </p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs">Email</Label>
                            <p className="font-medium flex items-center gap-1">
                                {supplier.email ? (
                                    <><Mail className="h-3 w-3 text-muted-foreground" /> {supplier.email}</>
                                ) : "\u2014"}
                            </p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs">Telefone</Label>
                            <p className="font-medium flex items-center gap-1">
                                {supplier.phone ? (
                                    <><Phone className="h-3 w-3 text-muted-foreground" /> {supplier.phone}</>
                                ) : "\u2014"}
                            </p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs">Website</Label>
                            <p className="font-medium flex items-center gap-1">
                                {supplier.website ? (
                                    <><Globe className="h-3 w-3 text-muted-foreground" /> {supplier.website}</>
                                ) : "\u2014"}
                            </p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs">Prazo de Pagamento</Label>
                            <p className="font-medium">
                                {supplier.paymentTermDays ? `${supplier.paymentTermDays} dias` : "\u2014"}
                            </p>
                        </div>
                        {supplier.notes && (
                            <div className="col-span-2">
                                <Label className="text-muted-foreground text-xs">Observacoes</Label>
                                <p className="font-medium">{supplier.notes}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Address */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Endereco
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {supplier.address ? (
                        <div className="space-y-1">
                            <p>{supplier.address}</p>
                            <p>
                                {[supplier.city, supplier.state].filter(Boolean).join(" - ")}
                            </p>
                            {supplier.zipCode && (
                                <p className="text-muted-foreground text-sm">CEP: {supplier.zipCode}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Endereço não informado</p>
                    )}

                    {/* Summary cards */}
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm text-muted-foreground">Notas Fiscais</span>
                            <span className="font-bold">{supplier._count.fiscalNotes}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm text-muted-foreground">Pedidos de Compra</span>
                            <span className="font-bold">{supplier._count.purchaseOrders}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm text-muted-foreground">Total Pago</span>
                            <span className="font-bold">{formatCurrency(supplier.financialSummary.totalPaid)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contacts */}
            <Card className="col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Contatos
                        </CardTitle>
                        <CardDescription>{supplier.contacts.length} contato(s) cadastrado(s)</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setAddContactOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Contato
                    </Button>
                </CardHeader>
                <CardContent>
                    {supplier.contacts.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Nenhum contato cadastrado</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supplier.contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {contact.name}
                                                {contact.isPrimary && (
                                                    <Crown className="h-3.5 w-3.5 text-yellow-500" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{contact.role || "\u2014"}</TableCell>
                                        <TableCell className="text-muted-foreground">{contact.email || "\u2014"}</TableCell>
                                        <TableCell className="text-muted-foreground">{contact.phone || "\u2014"}</TableCell>
                                        <TableCell>
                                            {contact.isPrimary ? (
                                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Principal</Badge>
                                            ) : (
                                                <Badge variant="outline">Contato</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveContact(contact.id)}
                                                disabled={removingId === contact.id}
                                            >
                                                {removingId === contact.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add Contact Dialog */}
            <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Contato</DialogTitle>
                        <DialogDescription>Cadastre um novo contato para este fornecedor.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nome *</Label>
                            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome do contato" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Cargo</Label>
                                <Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Ex: Gerente Comercial" />
                            </div>
                            <div>
                                <Label>Telefone</Label>
                                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(11) 99999-9999" />
                            </div>
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contato@empresa.com" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isPrimary"
                                checked={contactPrimary}
                                onChange={(e) => setContactPrimary(e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="isPrimary">Contato principal</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setAddContactOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddContact} disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Adicionar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ============================================================
// Tab: Documentos
// ============================================================

function TabDocuments({ supplier }: { supplier: SupplierData }) {
    const { toast } = useToast()
    const [uploadOpen, setUploadOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [docType, setDocType] = useState<string>("OUTROS")
    const [expiresAt, setExpiresAt] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    async function handleUpload() {
        if (!selectedFile) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um arquivo" })
            return
        }
        setUploading(true)
        const formData = new FormData()
        formData.append("supplierId", supplier.id)
        formData.append("type", docType)
        formData.append("file", selectedFile)
        if (expiresAt) formData.append("expiresAt", expiresAt)

        const result = await uploadSupplierDocument(formData)
        setUploading(false)
        if (result.success) {
            toast({ title: "Documento enviado!", description: `${selectedFile.name} foi enviado com sucesso.` })
            setUploadOpen(false)
            setSelectedFile(null)
            setExpiresAt("")
            setDocType("OUTROS")
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    // Group by type
    const docsByType: Record<string, SupplierDocument[]> = {}
    for (const doc of supplier.documents) {
        if (!docsByType[doc.type]) docsByType[doc.type] = []
        docsByType[doc.type]!.push(doc)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Documentos</h2>
                    <p className="text-muted-foreground text-sm">{supplier.documents.length} documento(s) cadastrado(s)</p>
                </div>
                <Button onClick={() => setUploadOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Documento
                </Button>
            </div>

            {supplier.documents.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                        <p className="text-muted-foreground">Nenhum documento cadastrado</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-3 gap-4">
                    {Object.entries(docsByType).map(([type, docs]) => (
                        <Card key={type}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">{DOC_TYPE_LABELS[type] ?? type}</CardTitle>
                                <CardDescription>{docs!.length} arquivo(s)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {docs!.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded text-sm">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{doc.filename}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(doc.uploadedAt)}
                                                </span>
                                                <DocStatusBadge expiresAt={doc.expiresAt} />
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" asChild>
                                            <a href={doc.filePath} download target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Upload Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Documento</DialogTitle>
                        <DialogDescription>Faca upload de um documento do fornecedor.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Tipo do Documento</Label>
                            <Select value={docType} onValueChange={setDocType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Arquivo *</Label>
                            <Input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        <div>
                            <Label>Data de Validade</Label>
                            <Input
                                type="date"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Opcional. O sistema alertara quando o documento estiver proximo do vencimento.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Enviar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ============================================================
// Tab: Historico Financeiro
// ============================================================

function TabFinancial({ supplier, financialData }: { supplier: SupplierData; financialData: FinancialData | null }) {
    const [filterYear, setFilterYear] = useState<string>("all")

    if (!financialData) {
        return (
            <Card>
                <CardContent className="text-center py-12">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Nenhum dado financeiro disponivel</p>
                </CardContent>
            </Card>
        )
    }

    const { totals, monthlyData, records } = financialData

    const years = [...new Set(records.map(r => new Date(r.date).getFullYear().toString()))].sort().reverse()

    const filteredRecords = filterYear === "all"
        ? records
        : records.filter(r => new Date(r.date).getFullYear().toString() === filterYear)

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(totals.totalPaid)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Media Mensal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(totals.averageMonthly)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Maior Compra</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(totals.largestPurchase)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Gastos Mensais (ultimos 12 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" fontSize={12} />
                                <YAxis
                                    fontSize={12}
                                    tickFormatter={(value: number) =>
                                        new Intl.NumberFormat('pt-BR', {
                                            notation: 'compact',
                                            compactDisplay: 'short',
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(value)
                                    }
                                />
                                <Tooltip
                                    formatter={((value: any) => [formatCurrency(Number(value ?? 0)), "Valor"]) as any}
                                    labelFormatter={((label: any) => `Periodo: ${String(label)}`) as any}
                                />
                                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Records table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Registros Financeiros</CardTitle>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Filtrar ano" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os anos</SelectItem>
                            {years.map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {filteredRecords.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Nenhum registro encontrado</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Descricao</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(record.date)}
                                        </TableCell>
                                        <TableCell>{record.description}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(record.value)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {STATUS_LABELS[record.status] ?? record.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

// ============================================================
// Tab: Avaliacoes
// ============================================================

function TabEvaluations({ supplier }: { supplier: SupplierData }) {
    const { toast } = useToast()
    const [evalOpen, setEvalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [quality, setQuality] = useState(3)
    const [delivery, setDelivery] = useState(3)
    const [price, setPrice] = useState(3)
    const [support, setSupport] = useState(3)
    const [comment, setComment] = useState("")

    const evaluations = supplier.evaluations

    // Calculate averages for radar chart
    const avgQuality = evaluations.length > 0
        ? evaluations.reduce((s, e) => s + e.quality, 0) / evaluations.length : 0
    const avgDelivery = evaluations.length > 0
        ? evaluations.reduce((s, e) => s + e.delivery, 0) / evaluations.length : 0
    const avgPrice = evaluations.length > 0
        ? evaluations.reduce((s, e) => s + e.price, 0) / evaluations.length : 0
    const avgSupport = evaluations.length > 0
        ? evaluations.reduce((s, e) => s + e.support, 0) / evaluations.length : 0

    const radarData = [
        { criteria: "Qualidade", value: avgQuality, fullMark: 5 },
        { criteria: "Prazo", value: avgDelivery, fullMark: 5 },
        { criteria: "Preco", value: avgPrice, fullMark: 5 },
        { criteria: "Suporte", value: avgSupport, fullMark: 5 },
    ]

    async function handleEvaluate() {
        setLoading(true)
        const result = await evaluateSupplier(supplier.id, {
            quality,
            delivery,
            price,
            support,
            comment: comment || undefined,
        })
        setLoading(false)
        if (result.success) {
            toast({ title: "Avaliacao registrada!", description: "A nota do fornecedor foi atualizada." })
            setEvalOpen(false)
            setQuality(3)
            setDelivery(3)
            setPrice(3)
            setSupport(3)
            setComment("")
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Avaliacoes</h2>
                    <p className="text-muted-foreground text-sm">{evaluations.length} avaliacao(oes) registrada(s)</p>
                </div>
                <Button onClick={() => setEvalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Avaliacao
                </Button>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-2 gap-6">
                {/* Overall rating & breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Nota Geral</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center mb-6">
                            <RatingStarsLarge rating={supplier.rating} size="lg" />
                        </div>
                        <div className="space-y-4">
                            <CriterionBar label="Qualidade" value={avgQuality} />
                            <CriterionBar label="Prazo de Entrega" value={avgDelivery} />
                            <CriterionBar label="Preco" value={avgPrice} />
                            <CriterionBar label="Suporte" value={avgSupport} />
                        </div>
                    </CardContent>
                </Card>

                {/* Radar chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Comparativo de Criterios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {evaluations.length === 0 ? (
                            <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                                Nenhuma avaliacao para exibir
                            </div>
                        ) : (
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="criteria" fontSize={12} />
                                        <Radar
                                            name="Media"
                                            dataKey="value"
                                            stroke="#3b82f6"
                                            fill="#3b82f6"
                                            fillOpacity={0.3}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* History list */}
            <Card>
                <CardHeader>
                    <CardTitle>Historico de Avaliacoes</CardTitle>
                </CardHeader>
                <CardContent>
                    {evaluations.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Nenhuma avaliacao registrada</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Avaliador</TableHead>
                                    <TableHead>Nota</TableHead>
                                    <TableHead>Qualidade</TableHead>
                                    <TableHead>Prazo</TableHead>
                                    <TableHead>Preco</TableHead>
                                    <TableHead>Suporte</TableHead>
                                    <TableHead>Comentario</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluations.map((evaluation) => (
                                    <TableRow key={evaluation.id}>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(evaluation.createdAt)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {evaluation.evaluator.name ?? evaluation.evaluator.email}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                                <span className="font-medium">{evaluation.score.toFixed(1)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{evaluation.quality.toFixed(1)}</TableCell>
                                        <TableCell>{evaluation.delivery.toFixed(1)}</TableCell>
                                        <TableCell>{evaluation.price.toFixed(1)}</TableCell>
                                        <TableCell>{evaluation.support.toFixed(1)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                            {evaluation.comment || "\u2014"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* New Evaluation Dialog */}
            <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nova Avaliacao</DialogTitle>
                        <DialogDescription>Avalie o desempenho de {supplier.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        <ScoreInput label="Qualidade" value={quality} onChange={setQuality} />
                        <ScoreInput label="Prazo de Entrega" value={delivery} onChange={setDelivery} />
                        <ScoreInput label="Preco" value={price} onChange={setPrice} />
                        <ScoreInput label="Suporte" value={support} onChange={setSupport} />

                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Nota Final</p>
                            <p className="text-2xl font-bold">
                                {((quality + delivery + price + support) / 4).toFixed(1)}
                            </p>
                        </div>

                        <div>
                            <Label>Comentario (opcional)</Label>
                            <Input
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Observacoes sobre o fornecedor..."
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEvalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleEvaluate} disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Registrar Avaliacao
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ============================================================
// Helper Components
// ============================================================

function CriterionBar({ label, value }: { label: string; value: number }) {
    const percentage = (value / 5) * 100
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className="font-medium">{value.toFixed(1)} / 5.0</span>
            </div>
            <Progress value={percentage} />
        </div>
    )
}

function ScoreInput({
    label,
    value,
    onChange,
}: {
    label: string
    value: number
    onChange: (v: number) => void
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <span className="text-sm font-medium">{value.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className="p-0.5 hover:scale-110 transition-transform"
                    >
                        <Star
                            className={`h-7 w-7 ${
                                star <= value
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300 hover:text-yellow-300"
                            }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    )
}

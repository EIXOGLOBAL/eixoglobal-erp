import { getCompanyById } from "@/app/actions/company-actions"
import { getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { CompanyDialog } from "@/components/companies/company-dialog"
import { CompanyContacts } from "@/components/companies/company-contacts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    ArrowLeft,
    Building2,
    Mail,
    Phone,
    MapPin,
    FolderKanban,
    Contact,
} from "lucide-react"
import { formatDate } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PLANNING: "outline",
    IN_PROGRESS: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
    ON_HOLD: "outline",
}

const statusLabels: Record<string, string> = {
    PLANNING: "Planejamento",
    IN_PROGRESS: "Em Andamento",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    ON_HOLD: "Em Espera",
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session) redirect("/login")

    const result = await getCompanyById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    const company = result.data
    const primaryEmail = company.contacts?.find(c => c.type === 'EMAIL' && c.isPrimary)
        || company.contacts?.find(c => c.type === 'EMAIL')
    const primaryPhone = company.contacts?.find(c => c.type === 'PHONE' && c.isPrimary)
        || company.contacts?.find(c => c.type === 'PHONE')

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild aria-label="Voltar">
                    <Link href="/companies">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                    {company.tradeName && (
                        <p className="text-muted-foreground text-sm">
                            Nome Fantasia: <span className="font-medium text-foreground">{company.tradeName}</span>
                        </p>
                    )}
                    <p className="text-muted-foreground font-mono text-xs">
                        CNPJ: {company.cnpj}
                        {company.code && <span className="ml-3">Cód: {company.code}</span>}
                    </p>
                </div>
                <CompanyDialog company={company} />
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">E-mail Principal</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm truncate">
                            {primaryEmail?.value || company.email || 'Não informado'}
                        </div>
                        {primaryEmail?.department && (
                            <p className="text-xs text-muted-foreground">{primaryEmail.department}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Telefone Principal</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm">
                            {primaryPhone?.value || company.phone || 'Não informado'}
                        </div>
                        {primaryPhone?.responsible && (
                            <p className="text-xs text-muted-foreground">{primaryPhone.responsible}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Localização</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm">
                            {company.city && company.state
                                ? `${company.city}/${company.state}`
                                : 'Não informado'
                            }
                        </div>
                        {company.address && (
                            <p className="text-xs text-muted-foreground truncate">{company.address}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projetos</CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{company._count.projects}</div>
                        <p className="text-xs text-muted-foreground">Total cadastrados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="projetos">
                <TabsList>
                    <TabsTrigger value="projetos">
                        <FolderKanban className="mr-2 h-4 w-4" />
                        Projetos ({company._count.projects})
                    </TabsTrigger>
                    <TabsTrigger value="contatos">
                        <Contact className="mr-2 h-4 w-4" />
                        Contatos ({company.contacts?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="dados">
                        <Building2 className="mr-2 h-4 w-4" />
                        Dados Cadastrais
                    </TabsTrigger>
                </TabsList>

                {/* Aba Projetos */}
                <TabsContent value="projetos">
                    <Card>
                        <CardHeader>
                            <CardTitle>Projetos</CardTitle>
                            <CardDescription>
                                Todos os projetos vinculados a esta empresa
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {company.projects && company.projects.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Início</TableHead>
                                            <TableHead>Término</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Medições</TableHead>
                                            <TableHead>Contratos</TableHead>
                                            <TableHead className="text-right">Orçamento</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {company.projects.map((project) => (
                                            <TableRow key={project.id}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/projects/${project.id}`}
                                                        className="hover:underline"
                                                    >
                                                        {project.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(project.startDate)}
                                                </TableCell>
                                                <TableCell>
                                                    {project.endDate
                                                        ? formatDate(project.endDate)
                                                        : '-'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariants[project.status]}>
                                                        {statusLabels[project.status]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {project._count?.measurements || 0}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {project._count?.contracts || 0}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL'
                                                    }).format(Number(project.budget || 0))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum projeto cadastrado para esta empresa.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba Contatos */}
                <TabsContent value="contatos">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contatos</CardTitle>
                            <CardDescription>
                                E-mails e telefones por departamento e responsável
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CompanyContacts
                                companyId={company.id}
                                contacts={company.contacts || []}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba Dados Cadastrais */}
                <TabsContent value="dados">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Cadastrais</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Nome Empresarial / Razão Social</span>
                                    <p className="font-medium">{company.name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Nome Fantasia</span>
                                    <p className="font-medium">{company.tradeName || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">CNPJ</span>
                                    <p className="font-mono">{company.cnpj}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Código</span>
                                    <p className="font-mono">{company.code || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Endereço</span>
                                    <p className="font-medium">{company.address || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">CEP</span>
                                    <p className="font-mono">{company.zipCode || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Cidade</span>
                                    <p className="font-medium">{company.city || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Estado</span>
                                    <p className="font-medium">{company.state || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Cadastrado em</span>
                                    <p className="font-medium">
                                        {formatDate(company.createdAt)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Última atualização</span>
                                    <p className="font-medium">
                                        {formatDate(company.updatedAt)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

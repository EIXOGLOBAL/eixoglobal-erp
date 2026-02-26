import { notFound, redirect } from "next/navigation"
import { getCostCompositionById } from "@/app/actions/cost-composition-actions"
import { getProjects } from "@/app/actions/project-actions"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Trash2, ArrowLeft, TrendingUp, DollarSign, Percent } from "lucide-react"
import Link from "next/link"
import { CompositionDialog } from "@/components/compositions/composition-dialog"
import { MaterialsEditor } from "@/components/compositions/materials-editor"
import { LaborEditor } from "@/components/compositions/labor-editor"
import { EquipmentEditor } from "@/components/compositions/equipment-editor"
import { DuplicateCompositionDialog } from "@/components/compositions/duplicate-composition-dialog"
import { DeleteCompositionButton } from "@/components/compositions/delete-composition-button"

export default async function ComposicaoDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const session = await getSession()
    if (!session) {
        redirect("/login")
    }

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const composition = await getCostCompositionById(id)
    const projectsResult = await getProjects(companyId)
    const projects = projectsResult.success ? (projectsResult.data || []) : []

    if (!composition) {
        notFound()
    }

    // Cálculos
    const directCost = Number(composition.directCost || 0)
    const bdi = Number(composition.bdi || 0)
    const salePrice = Number(composition.salePrice || 0)

    // Custos por categoria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const materialsCost = composition.materials.reduce((sum: number, m: any) =>
        sum + (Number(m.coefficient) * Number(m.unitCost)), 0
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const laborCost = composition.labor.reduce((sum: number, l: any) =>
        sum + (Number(l.hours) * Number(l.hourlyRate)), 0
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const equipmentCost = composition.equipment.reduce((sum: number, e: any) =>
        sum + (Number(e.coefficient) * Number(e.unitCost)), 0
    )

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/composicoes">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">{composition.code}</h2>
                            <p className="text-muted-foreground">{composition.description}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DuplicateCompositionDialog compositionId={composition.id} />
                    <DeleteCompositionButton compositionId={composition.id} />
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Custo Direto
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(directCost)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Materiais: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(materialsCost)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Mão de Obra: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(laborCost)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Equipamentos: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(equipmentCost)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            BDI
                        </CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bdi.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Benefícios e Despesas Indiretas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Preço de Venda
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(salePrice)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Por {composition.unit}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="dados" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                    <TabsTrigger value="materiais">
                        Materiais ({composition.materials.length})
                    </TabsTrigger>
                    <TabsTrigger value="mao-de-obra">
                        Mão de Obra ({composition.labor.length})
                    </TabsTrigger>
                    <TabsTrigger value="equipamentos">
                        Equipamentos ({composition.equipment.length})
                    </TabsTrigger>
                </TabsList>

                {/* Aba: Dados Gerais */}
                <TabsContent value="dados" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Informações da Composição</CardTitle>
                            <CompositionDialog
                                composition={composition}
                                companyId={companyId}
                                projects={projects}
                                trigger={
                                    <Button variant="outline" size="sm">
                                        Editar Dados
                                    </Button>
                                }
                            />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Código</p>
                                    <p className="text-lg font-semibold">{composition.code}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Unidade</p>
                                    <p className="text-lg font-semibold">{composition.unit}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                                <p className="text-lg">{composition.description}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Projeto Vinculado</p>
                                {composition.project ? (
                                    <Link href={`/projects/${composition.project.id}`}>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                                            {composition.project.name}
                                        </Badge>
                                    </Link>
                                ) : (
                                    <Badge>Global</Badge>
                                )}
                            </div>

                            <div className="pt-4 border-t">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Custo Direto</p>
                                        <p className="text-xl font-bold">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(directCost)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">BDI (%)</p>
                                        <p className="text-xl font-bold">{bdi.toFixed(2)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Preço de Venda</p>
                                        <p className="text-xl font-bold text-green-700">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(salePrice)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba: Materiais */}
                <TabsContent value="materiais">
                    <Card>
                        <CardHeader>
                            <CardTitle>Materiais</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MaterialsEditor
                                compositionId={composition.id}
                                materials={composition.materials}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba: Mão de Obra */}
                <TabsContent value="mao-de-obra">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mão de Obra</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <LaborEditor
                                compositionId={composition.id}
                                labor={composition.labor}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba: Equipamentos */}
                <TabsContent value="equipamentos">
                    <Card>
                        <CardHeader>
                            <CardTitle>Equipamentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EquipmentEditor
                                compositionId={composition.id}
                                equipment={composition.equipment}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Card de Resumo Fixo */}
            <Card className="border-2 border-green-200 bg-green-50/50">
                <CardHeader>
                    <CardTitle className="text-green-800">Resumo da Composição</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Materiais</p>
                            <p className="text-lg font-semibold">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(materialsCost)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {composition.materials.length} itens
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Mão de Obra</p>
                            <p className="text-lg font-semibold">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(laborCost)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {composition.labor.length} itens
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Equipamentos</p>
                            <p className="text-lg font-semibold">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(equipmentCost)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {composition.equipment.length} itens
                            </p>
                        </div>
                        <div className="border-l-2 border-green-300 pl-4">
                            <p className="text-sm font-medium text-green-800">PREÇO FINAL</p>
                            <p className="text-2xl font-bold text-green-700">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(salePrice)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {composition.unit} (BDI {bdi.toFixed(2)}%)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

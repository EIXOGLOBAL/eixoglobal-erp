import { notFound, redirect } from "next/navigation"
import { getCostCompositionById, getCostCompositions } from "@/app/actions/cost-composition-actions"
import { getProjects } from "@/app/actions/project-actions"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CompositionDialog } from "@/components/compositions/composition-dialog"
import { DuplicateCompositionDialog } from "@/components/compositions/duplicate-composition-dialog"
import { DeleteCompositionButton } from "@/components/compositions/delete-composition-button"
import { CostSummaryCard } from "@/components/compositions/cost-summary-card"
import { GeneralInfoSection } from "@/components/compositions/general-info-section"
import { CompositionTabsSection } from "@/components/compositions/composition-tabs-section"

export const dynamic = 'force-dynamic'

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
    const projectsResult = await getProjects({ companyId })
    const projects = projectsResult.success ? (projectsResult.data || []) : []

    // Get all compositions for comparison
    const allCompositions = await getCostCompositions(companyId)

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
                            <Button variant="ghost" size="icon" title="Voltar para composições">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">{composition.code}</h2>
                            <p className="text-muted-foreground max-w-2xl">{composition.description}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DuplicateCompositionDialog compositionId={composition.id} />
                    <DeleteCompositionButton compositionId={composition.id} />
                </div>
            </div>

            {/* Resumo de Custos - Cards de destaque */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Custo Direto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(directCost)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Soma de materiais, mão de obra e equipamentos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Acréscimo BDI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bdi.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(directCost * (bdi / 100))}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Preço de Venda</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(salePrice)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Por unidade ({composition.unit})
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Seção: Informações Gerais */}
            <GeneralInfoSection
                composition={composition}
                companyId={companyId}
                projects={projects}
            />

            {/* Seção: Abas com Detalhes */}
            <CompositionTabsSection
                composition={composition}
                allCompositions={allCompositions || []}
            />

            {/* Card de Resumo Final */}
            <CostSummaryCard
                materialsCost={materialsCost}
                laborCost={laborCost}
                equipmentCost={equipmentCost}
                directCost={directCost}
                bdi={bdi}
                salePrice={salePrice}
                unit={composition.unit}
            />
        </div>
    )
}

'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Package,
    Users,
    Wrench,
    PieChart,
    Scale,
} from "lucide-react"
import { MaterialsEditor } from "./materials-editor"
import { LaborEditor } from "./labor-editor"
import { EquipmentEditor } from "./equipment-editor"
import { CostBreakdownChart } from "./cost-breakdown-chart"
import { BDIBreakdown } from "./bdi-breakdown"
import { CalculationFormula } from "./calculation-formula"
import { CompositionComparison } from "./composition-comparison"

interface CompositionTabsSectionProps {
    composition: any
    allCompositions: any[]
}

export function CompositionTabsSection({
    composition,
    allCompositions,
}: CompositionTabsSectionProps) {
    const materialsCost = composition.materials.reduce((sum: number, m: any) =>
        sum + (Number(m.coefficient) * Number(m.unitCost)), 0
    )

    const laborCost = composition.labor.reduce((sum: number, l: any) =>
        sum + (Number(l.hours) * Number(l.hourlyRate)), 0
    )

    const equipmentCost = composition.equipment.reduce((sum: number, e: any) =>
        sum + (Number(e.coefficient) * Number(e.unitCost)), 0
    )

    const directCost = Number(composition.directCost || 0)
    const bdi = Number(composition.bdi || 0)
    const salePrice = Number(composition.salePrice || 0)

    return (
        <Tabs defaultValue="materiais" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="materiais" className="gap-2">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Materiais</span>
                    <span className="sm:hidden">{composition.materials.length}</span>
                </TabsTrigger>
                <TabsTrigger value="mao-de-obra" className="gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Mão de Obra</span>
                    <span className="sm:hidden">{composition.labor.length}</span>
                </TabsTrigger>
                <TabsTrigger value="equipamentos" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Equipamentos</span>
                    <span className="sm:hidden">{composition.equipment.length}</span>
                </TabsTrigger>
                <TabsTrigger value="analise" className="gap-2">
                    <PieChart className="h-4 w-4" />
                    <span className="hidden sm:inline">Análise</span>
                </TabsTrigger>
                <TabsTrigger value="comparacao" className="gap-2">
                    <Scale className="h-4 w-4" />
                    <span className="hidden sm:inline">Comparação</span>
                </TabsTrigger>
            </TabsList>

            {/* Aba: Materiais */}
            <TabsContent value="materiais">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-blue-600" />
                                    Materiais
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Componentes e insumos utilizados na composição
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(materialsCost)}
                                </p>
                            </div>
                        </div>
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
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-orange-600" />
                                    Mão de Obra
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Custos com pessoal e recursos humanos
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(laborCost)}
                                </p>
                            </div>
                        </div>
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
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <Wrench className="h-5 w-5 text-purple-600" />
                                    Equipamentos
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Máquinas, ferramentas e dispositivos necessários
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(equipmentCost)}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <EquipmentEditor
                            compositionId={composition.id}
                            equipment={composition.equipment}
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Aba: Análise Detalhada */}
            <TabsContent value="analise" className="space-y-4">
                <CostBreakdownChart
                    materialsCost={materialsCost}
                    laborCost={laborCost}
                    equipmentCost={equipmentCost}
                    bdi={bdi}
                    directCost={directCost}
                    salePrice={salePrice}
                />

                <BDIBreakdown
                    bdiPercent={bdi}
                    directCost={directCost}
                    salePrice={salePrice}
                />

                <CalculationFormula
                    materialsCost={materialsCost}
                    laborCost={laborCost}
                    equipmentCost={equipmentCost}
                    directCost={directCost}
                    bdi={bdi}
                    salePrice={salePrice}
                />
            </TabsContent>

            {/* Aba: Comparação */}
            <TabsContent value="comparacao">
                <CompositionComparison
                    compositions={allCompositions}
                    currentCompositionId={composition.id}
                />
            </TabsContent>
        </Tabs>
    )
}

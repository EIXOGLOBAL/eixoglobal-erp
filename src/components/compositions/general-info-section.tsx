'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit2 } from "lucide-react"
import { CompositionDialog } from "./composition-dialog"

interface GeneralInfoSectionProps {
    composition: any
    companyId: string
    projects: any[]
    onEdit?: () => void
}

export function GeneralInfoSection({
    composition,
    companyId,
    projects,
    onEdit,
}: GeneralInfoSectionProps) {
    const directCost = Number(composition.directCost || 0)
    const bdi = Number(composition.bdi || 0)
    const salePrice = Number(composition.salePrice || 0)

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Informações da Composição</CardTitle>
                <CompositionDialog
                    composition={composition}
                    companyId={companyId}
                    projects={projects}
                    trigger={
                        <Button variant="outline" size="sm" className="gap-2">
                            <Edit2 className="h-4 w-4" />
                            Editar Dados
                        </Button>
                    }
                />
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Seção 1: Identificação */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">Identificação</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Código</p>
                            <p className="text-lg font-semibold font-mono">{composition.code}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Unidade</p>
                            <p className="text-lg font-semibold">
                                <Badge variant="outline">{composition.unit}</Badge>
                            </p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                        <p className="text-base mt-1">{composition.description}</p>
                    </div>
                </div>

                {/* Seção 2: Vinculações */}
                <div className="space-y-3 pt-3 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground">Vinculações</h3>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Projeto Vinculado</p>
                        {composition.project ? (
                            <Link href={`/projects/${composition.project.id}`}>
                                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                                    {composition.project.name}
                                </Badge>
                            </Link>
                        ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Global (Compartilhada)
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Seção 3: Resumo de Custos */}
                <div className="space-y-3 pt-3 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground">Resumo de Custos</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs font-medium text-blue-600">Custo Direto</p>
                            <p className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(directCost)}</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                            <p className="text-xs font-medium text-amber-600">BDI</p>
                            <p className="text-xl font-bold text-amber-900 mt-1">{bdi.toFixed(2)}%</p>
                            <p className="text-xs text-amber-700 mt-1">{formatCurrency(directCost * (bdi / 100))}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <p className="text-xs font-medium text-green-600">Preço de Venda</p>
                            <p className="text-xl font-bold text-green-900 mt-1">{formatCurrency(salePrice)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

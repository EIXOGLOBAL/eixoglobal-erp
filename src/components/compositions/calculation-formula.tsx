'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

interface CalculationFormulaProps {
  materialsCost: number
  laborCost: number
  equipmentCost: number
  directCost: number
  bdi: number
  salePrice: number
}

export function CalculationFormula({
  materialsCost,
  laborCost,
  equipmentCost,
  directCost,
  bdi,
  salePrice,
}: CalculationFormulaProps) {
  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const bdiValue = salePrice - directCost

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Cálculo da Composição</CardTitle>
        <CardDescription>Fórmula detalhada passo a passo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Direct Costs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Etapa 1</Badge>
            <h4 className="font-semibold">Cálculo do Custo Direto</h4>
          </div>

          <div className="space-y-2 bg-muted/50 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Materiais</span>
              <span className="font-semibold">{currencyFormatter(materialsCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mão de Obra</span>
              <span className="font-semibold">{currencyFormatter(laborCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Equipamentos</span>
              <span className="font-semibold">{currencyFormatter(equipmentCost)}</span>
            </div>

            <div className="border-t border-muted my-2 pt-2 flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Σ Custo Direto</span>
              <span className="text-lg font-bold text-blue-600">
                {currencyFormatter(directCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: BDI Calculation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Etapa 2</Badge>
            <h4 className="font-semibold">Aplicação do BDI</h4>
          </div>

          <div className="space-y-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 font-mono text-sm">
            <div>
              <span className="text-muted-foreground">Custo Direto</span>
              <div className="mt-1 text-right font-semibold">
                {currencyFormatter(directCost)}
              </div>
            </div>

            <div className="border-t border-purple-200 my-2 pt-2">
              <span className="text-muted-foreground">BDI ({bdi.toFixed(2)}%)</span>
              <div className="mt-1 text-right font-semibold text-purple-700">
                {currencyFormatter(directCost)} × {((bdi / 100) + 1).toFixed(4)}
              </div>
            </div>

            <div className="border-t border-purple-200 my-2 pt-2 flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Fator Aplicado</span>
              <span className="text-lg font-bold text-purple-600">
                {((bdi / 100) + 1).toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Final Price */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Etapa 3</Badge>
            <h4 className="font-semibold">Preço Final</h4>
          </div>

          <div className="space-y-2 bg-green-50 dark:bg-green-950/30 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center gap-2 justify-between mb-2">
              <span className="text-muted-foreground">Custo Direto</span>
              <span className="font-semibold">{currencyFormatter(directCost)}</span>
            </div>

            <div className="flex items-center justify-center my-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-2 justify-between mb-2">
              <span className="text-muted-foreground">× (1 + BDI%)</span>
              <span className="font-semibold">× {((bdi / 100) + 1).toFixed(4)}</span>
            </div>

            <div className="flex items-center justify-center my-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="border-t border-green-200 pt-2 flex items-center justify-between">
              <span className="text-muted-foreground font-bold">Preço de Venda</span>
              <span className="text-lg font-bold text-green-700">
                {currencyFormatter(salePrice)}
              </span>
            </div>
          </div>

          {/* BDI breakdown */}
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Custo Direto</span>
              <span className="font-semibold">{currencyFormatter(directCost)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>+ BDI (agregado)</span>
              <span className="font-semibold">{currencyFormatter(bdiValue)}</span>
            </div>
            <div className="border-t border-muted pt-1 flex justify-between font-bold">
              <span>= Preço Final</span>
              <span className="text-green-700">{currencyFormatter(salePrice)}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3 text-sm">Resumo da Fórmula</h4>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs leading-relaxed">
            <div className="mb-2">
              <span className="text-muted-foreground">Preço de Venda = </span>
              <span className="font-bold">(Mat + MO + Equip) × (1 + BDI%)</span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {currencyFormatter(directCost)} × {((bdi / 100) + 1).toFixed(4)} = {currencyFormatter(salePrice)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

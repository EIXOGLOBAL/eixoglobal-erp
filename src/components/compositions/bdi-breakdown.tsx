'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Percent } from 'lucide-react'

interface BDIBreakdownProps {
  bdiPercent: number
  directCost: number
  salePrice: number
}

export function BDIBreakdown({ bdiPercent, directCost, salePrice }: BDIBreakdownProps) {
  const bdiValue = salePrice - directCost
  const margin = ((bdiValue / salePrice) * 100)

  // Common BDI components (estimated breakdown)
  const bdiComponents = [
    {
      name: 'Administração Central (AC)',
      percent: 5,
      color: 'bg-blue-500',
    },
    {
      name: 'Seguro e Taxas (SE)',
      percent: 2,
      color: 'bg-cyan-500',
    },
    {
      name: 'Despesas Financeiras (DF)',
      percent: 1.5,
      color: 'bg-orange-500',
    },
    {
      name: 'Lucro Previsto (L)',
      percent: 8,
      color: 'bg-green-500',
    },
  ]

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Análise Detalhada do BDI
        </CardTitle>
        <CardDescription>
          Benefícios e Despesas Indiretas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">Custo Direto</p>
            <p className="text-xl font-bold">{currencyFormatter(directCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {((directCost / salePrice) * 100).toFixed(1)}% do preço
            </p>
          </div>

          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">BDI (Valor)</p>
            <p className="text-xl font-bold text-purple-700">{currencyFormatter(bdiValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {bdiPercent.toFixed(2)}% aplicado
            </p>
          </div>

          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">Preço Final</p>
            <p className="text-xl font-bold text-green-700">{currencyFormatter(salePrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              100% do preço
            </p>
          </div>
        </div>

        {/* Breakdown formula */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-semibold">Fórmula de Cálculo</h4>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Preço Final = </span>
              <span className="font-semibold">Custo Direto × (1 + BDI%)</span>
            </div>
            <div className="text-muted-foreground text-xs">
              {currencyFormatter(directCost)} × (1 + {bdiPercent.toFixed(2)}%)
            </div>
            <div className="text-muted-foreground text-xs">
              {currencyFormatter(directCost)} × {(1 + bdiPercent / 100).toFixed(4)}
            </div>
            <div className="text-green-600 font-semibold pt-1 border-t border-muted">
              = {currencyFormatter(salePrice)}
            </div>
          </div>
        </div>

        {/* BDI Components breakdown (estimated) */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-semibold">Componentes do BDI (Estimativa)</h4>
          <div className="space-y-2">
            {bdiComponents.map((component, index) => {
              const componentValue = (directCost * component.percent) / 100

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${component.color}`} />
                      <span className="text-xs font-medium">{component.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold">
                        {component.percent.toFixed(2)}%
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({currencyFormatter(componentValue)})
                      </span>
                    </div>
                  </div>
                  <Progress value={component.percent} max={bdiPercent} className="h-1.5" />
                </div>
              )
            })}
          </div>

          {/* Total BDI line */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Total BDI</span>
              <div className="text-right">
                <span className="text-xs font-bold text-purple-700">
                  {bdiPercent.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({currencyFormatter(bdiValue)})
                </span>
              </div>
            </div>
            <Progress value={bdiPercent} className="h-2 mt-1" />
          </div>
        </div>

        {/* Margin analysis */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-semibold">Análise de Margem</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margem de Lucro (%)</span>
              <span className="font-semibold text-green-600">{margin.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Por unidade</span>
              <span>{currencyFormatter(bdiValue)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

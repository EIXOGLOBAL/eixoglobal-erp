'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CostBreakdownChartProps {
  materialsCost: number
  laborCost: number
  equipmentCost: number
  bdi: number
  directCost: number
  salePrice: number
}

export function CostBreakdownChart({
  materialsCost,
  laborCost,
  equipmentCost,
  bdi,
  directCost,
  salePrice,
}: CostBreakdownChartProps) {
  // Dados para o gráfico de custo direto
  const costData = [
    { name: 'Materiais', value: materialsCost, color: '#3b82f6' },
    { name: 'Mão de Obra', value: laborCost, color: '#f59e0b' },
    { name: 'Equipamentos', value: equipmentCost, color: '#10b981' },
  ].filter(item => item.value > 0)

  // Dados para o gráfico de composição final
  const compositionData = [
    { name: 'Custo Direto', value: directCost, color: '#6366f1' },
    {
      name: `BDI (${bdi.toFixed(1)}%)`,
      value: salePrice - directCost,
      color: '#8b5cf6',
    },
  ]

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value)
  }

  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / (entry.payload.reduce((sum: number, item: any) => sum + item.value, 0))) * 100).toFixed(0)
    return `${percent}%`
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Custo Direto Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Composição do Custo Direto</CardTitle>
          <CardDescription>Distribuição por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          {costData.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={costData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderCustomLabel}
                  >
                    {costData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => currencyFormatter(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              {/* Details */}
              <div className="space-y-2 pt-4 border-t">
                {costData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {currencyFormatter(item.value)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((item.value / directCost) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t font-semibold">
                  <span className="text-sm">Total Direto</span>
                  <span className="text-sm">{currencyFormatter(directCost)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Sem itens de custo
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preço Final Composition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Composição do Preço Final</CardTitle>
          <CardDescription>Custo direto + BDI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderCustomLabel}
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => currencyFormatter(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* Details */}
            <div className="space-y-2 pt-4 border-t">
              {compositionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {currencyFormatter(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((item.value / salePrice) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t font-bold">
                <span className="text-sm">Preço Final</span>
                <span className="text-sm text-green-600">
                  {currencyFormatter(salePrice)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

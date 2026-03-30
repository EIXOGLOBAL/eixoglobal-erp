'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { X } from 'lucide-react'

interface Composition {
  id: string
  code: string
  description: string
  directCost: number
  bdi: number
  salePrice: number
}

interface CompositionComparisonProps {
  compositions: Composition[]
  currentCompositionId: string
}

export function CompositionComparison({
  compositions,
  currentCompositionId,
}: CompositionComparisonProps) {
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null)

  const current = compositions.find(c => c.id === currentCompositionId)
  const comparison = selectedComparisonId
    ? compositions.find(c => c.id === selectedComparisonId)
    : null

  if (!current) return null

  const comparisonData = comparison
    ? [
      {
        metric: 'Custo Direto',
        [current.code]: Number(current.directCost),
        [comparison.code]: Number(comparison.directCost),
      },
      {
        metric: 'BDI (%)',
        [current.code]: Number(current.bdi),
        [comparison.code]: Number(comparison.bdi),
      },
      {
        metric: 'Preço Final',
        [current.code]: Number(current.salePrice),
        [comparison.code]: Number(comparison.salePrice),
      },
    ]
    : null

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparar Composições</CardTitle>
        <CardDescription>
          Analise lado a lado duas composições de custo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Composição para Comparar
            </label>
            <Select value={selectedComparisonId || ''} onValueChange={setSelectedComparisonId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma composição" />
              </SelectTrigger>
              <SelectContent>
                {compositions
                  .filter(c => c.id !== currentCompositionId)
                  .map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.description}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {comparison && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedComparisonId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Comparison View */}
        {comparison ? (
          <div className="space-y-4">
            {/* Chart */}
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis yAxisId="left" tickFormatter={currencyFormatter} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value: number) => currencyFormatter(value)}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey={current.code}
                    fill="#3b82f6"
                    name={current.code}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey={comparison.code}
                    fill="#f59e0b"
                    name={comparison.code}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Comparison Table */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Current */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-4 text-blue-700">{current.code}</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Custo Direto</p>
                    <p className="text-lg font-bold">
                      {currencyFormatter(Number(current.directCost))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">BDI</p>
                    <p className="text-lg font-bold">{Number(current.bdi).toFixed(2)}%</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Preço Final</p>
                    <p className="text-xl font-bold text-green-600">
                      {currencyFormatter(Number(current.salePrice))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-4 text-amber-700">{comparison.code}</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Custo Direto</p>
                    <p className="text-lg font-bold">
                      {currencyFormatter(Number(comparison.directCost))}
                    </p>
                    <p className="text-xs mt-1">
                      {Number(comparison.directCost) > Number(current.directCost) ? '▲' : '▼'}{' '}
                      {currencyFormatter(
                        Math.abs(
                          Number(comparison.directCost) - Number(current.directCost)
                        )
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">BDI</p>
                    <p className="text-lg font-bold">{Number(comparison.bdi).toFixed(2)}%</p>
                    <p className="text-xs mt-1">
                      {Number(comparison.bdi) > Number(current.bdi) ? '▲' : '▼'}{' '}
                      {(Number(comparison.bdi) - Number(current.bdi)).toFixed(2)}%
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Preço Final</p>
                    <p className="text-xl font-bold text-green-600">
                      {currencyFormatter(Number(comparison.salePrice))}
                    </p>
                    <p className="text-xs mt-1">
                      {Number(comparison.salePrice) > Number(current.salePrice) ? '▲' : '▼'}{' '}
                      {currencyFormatter(
                        Math.abs(
                          Number(comparison.salePrice) - Number(current.salePrice)
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Selecione uma composição para comparar
          </div>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

interface ContractItem {
  id: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
}

interface ContractItemsTableEnhancedProps {
  items: ContractItem[]
}

export function ContractItemsTableEnhanced({ items }: ContractItemsTableEnhancedProps) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Itens do Contrato</CardTitle>
          <CardDescription>Nenhum item cadastrado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum item foi adicionado a este contrato.
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const itemValues = items.map(item => ({
    ...item,
    value: item.quantity * item.unitPrice,
    percent: totalValue > 0 ? (item.quantity * item.unitPrice / totalValue) * 100 : 0,
  }))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Itens do Contrato</CardTitle>
          <CardDescription>
            Total de {items.length} item{items.length !== 1 ? 's' : ''} — Valor total:{' '}
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(totalValue)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Unidade</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preço Unitário</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">% do Contrato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemValues.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    }).format(item.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(item.value)}
                  </TableCell>
                  <TableCell className="text-right w-[120px]">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={item.percent} className="w-16 h-2" />
                      <span className="text-xs font-medium w-8 text-right">
                        {item.percent.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cumulative totals card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resumo Cumulativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {itemValues.map((item, index) => {
              const cumulativeValue = itemValues
                .slice(0, index + 1)
                .reduce((sum, i) => sum + i.value, 0)
              const cumulativePercent = (cumulativeValue / totalValue) * 100

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{item.description}</span>
                    <span className="text-muted-foreground">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(cumulativeValue)}
                    </span>
                  </div>
                  <Progress value={cumulativePercent} className="h-1.5" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DollarSign, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'

interface ContractExecutiveSummaryProps {
  identifier: string
  value: number
  measuredValue: number
  paidValue: number
  itemsCount: number
  amendmentsCount: number
  bulletinsCount: number
  status: string
}

export function ContractExecutiveSummary({
  identifier,
  value,
  measuredValue,
  paidValue,
  itemsCount,
  amendmentsCount,
  bulletinsCount,
  status,
}: ContractExecutiveSummaryProps) {
  const executionPercent = value > 0 ? (measuredValue / value) * 100 : 0
  const paymentPercent = measuredValue > 0 ? (paidValue / measuredValue) * 100 : 0
  const balance = value - measuredValue
  const overrun = measuredValue > value

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200'
      case 'COMPLETED':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200'
      case 'CANCELLED':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200'
      default:
        return 'bg-gray-50 dark:bg-gray-950/30 border-gray-200'
    }
  }

  return (
    <Card className={`border-2 ${getStatusColor(status)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Resumo Executivo - {identifier}
          </CardTitle>
          <Badge variant="outline">{status === 'ACTIVE' ? 'Em Execução' : status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main metrics row */}
          <div className="grid grid-cols-4 gap-4">
            {/* Contrato */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Valor do Contrato</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                }).format(value)}
              </p>
              <p className="text-xs text-muted-foreground">{itemsCount} itens</p>
            </div>

            {/* Medido */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Total Medido</p>
              <p className="text-2xl font-bold text-orange-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                }).format(measuredValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {bulletinsCount} boletim{bulletinsCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Pago */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Total Pago</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                }).format(paidValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {paymentPercent.toFixed(0)}% do medido
              </p>
            </div>

            {/* Saldo */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {overrun ? 'Estouro' : 'Saldo a Medir'}
              </p>
              <p className={`text-2xl font-bold ${overrun ? 'text-red-600' : 'text-blue-600'}`}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                }).format(Math.abs(balance))}
              </p>
              <p className="text-xs text-muted-foreground">{amendmentsCount} aditivo(s)</p>
            </div>
          </div>

          {/* Progress bars */}
          <div className="space-y-3 pt-2 border-t">
            {/* Execução Financeira */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Execução Financeira
                </label>
                <span className={`text-xs font-bold ${executionPercent > 100 ? 'text-red-600' : 'text-green-600'}`}>
                  {executionPercent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(executionPercent, 100)}
                className="h-2"
              />
              {overrun && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Contrato acima do valor em {(executionPercent - 100).toFixed(1)}%
                </p>
              )}
            </div>

            {/* Pagamento */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Pagamento (do Medido)
                </label>
                <span className="text-xs font-bold text-blue-600">
                  {paymentPercent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={paymentPercent}
                className="h-2"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

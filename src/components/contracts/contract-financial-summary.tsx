import { getContractFinancialSummary } from '@/app/actions/contract-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign,
  FileText,
  Receipt,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)

interface ContractFinancialSummaryProps {
  contractId: string
}

export async function ContractFinancialSummary({
  contractId,
}: ContractFinancialSummaryProps) {
  const result = await getContractFinancialSummary(contractId)

  if (!result.success || !result.data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Nao foi possivel carregar o resumo financeiro.
        </CardContent>
      </Card>
    )
  }

  const {
    totalValue,
    measuredValue,
    invoicedValue,
    remainingBalance,
    executionPercent,
    bulletinsCount,
    invoicesCount,
  } = result.data

  const isNegativeBalance = remainingBalance < 0
  const clampedPercent = Math.min(executionPercent, 100)

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            Resumo Financeiro
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {bulletinsCount} boletim(ns) | {invoicesCount} nota(s) fiscal(is)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Valor Contratado */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">
                Valor Contratado
              </span>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(totalValue)}
            </p>
          </div>

          {/* Valor Medido */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-xs font-medium text-muted-foreground">
                Valor Medido
              </span>
            </div>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
              {formatCurrency(measuredValue)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {bulletinsCount} boletim(ns) aprovado(s)
            </p>
          </div>

          {/* Valor Faturado */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-xs font-medium text-muted-foreground">
                Valor Faturado
              </span>
            </div>
            <p className="text-xl font-bold text-violet-700 dark:text-violet-400">
              {formatCurrency(invoicedValue)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {invoicesCount} NF(s) emitida(s)
            </p>
          </div>

          {/* Saldo Restante */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              {isNegativeBalance ? (
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <Wallet className="h-3.5 w-3.5 text-green-600" />
              )}
              <span className="text-xs font-medium text-muted-foreground">
                Saldo Restante
              </span>
            </div>
            <p
              className={`text-xl font-bold ${
                isNegativeBalance
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-green-700 dark:text-green-400'
              }`}
            >
              {formatCurrency(Math.abs(remainingBalance))}
            </p>
            {isNegativeBalance && (
              <p className="text-[10px] font-semibold text-red-600">
                Faturamento excede o contrato
              </p>
            )}
          </div>

          {/* % Executado */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-muted-foreground">
                % Executado
              </span>
            </div>
            <p
              className={`text-xl font-bold ${
                executionPercent > 100
                  ? 'text-red-700 dark:text-red-400'
                  : executionPercent >= 80
                    ? 'text-orange-700 dark:text-orange-400'
                    : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {executionPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Progresso da Execucao (Medido / Contratado)
            </span>
            <span
              className={`text-xs font-bold ${
                executionPercent > 100
                  ? 'text-red-600'
                  : executionPercent >= 80
                    ? 'text-orange-600'
                    : 'text-emerald-600'
              }`}
            >
              {executionPercent.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={clampedPercent} className="h-3" />
          </div>
          {executionPercent > 100 && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Medicao ultrapassou o valor contratado em{' '}
              {(executionPercent - 100).toFixed(1)}%
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

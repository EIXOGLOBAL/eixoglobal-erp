'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ContractExecutionChartProps {
  contractValue: number
  measuredValue: number
  paidValue: number
}

export function ContractExecutionChart({
  contractValue,
  measuredValue,
  paidValue,
}: ContractExecutionChartProps) {
  const data = [
    {
      name: 'Valores',
      'Valor do Contrato': contractValue,
      'Valor Medido': measuredValue,
      'Valor Pago': paidValue,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execução Financeira</CardTitle>
        <CardDescription>
          Comparativo entre valor contratado, medido e pago
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={currencyFormatter} />
            <Tooltip
              formatter={(value: number) => currencyFormatter(value)}
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
              }}
            />
            <Legend />
            <Bar dataKey="Valor do Contrato" fill="#3b82f6" />
            <Bar dataKey="Valor Medido" fill="#f59e0b" />
            <Bar dataKey="Valor Pago" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

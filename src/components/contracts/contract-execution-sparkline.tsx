'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface ContractExecutionSparklineProps {
  bulletins: Array<{
    referenceMonth: string
    totalValue: number
  }>
  height?: number
}

export function ContractExecutionSparkline({
  bulletins,
  height = 40,
}: ContractExecutionSparklineProps) {
  if (!bulletins || bulletins.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground">
        Sem dados
      </div>
    )
  }

  // Group by month and sum
  const monthlyData = bulletins.reduce((acc, b) => {
    const existing = acc.find(item => item.month === b.referenceMonth)
    if (existing) {
      existing.value += Number(b.totalValue || 0)
    } else {
      acc.push({
        month: b.referenceMonth,
        value: Number(b.totalValue || 0),
      })
    }
    return acc
  }, [] as Array<{ month: string; value: number }>)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={monthlyData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

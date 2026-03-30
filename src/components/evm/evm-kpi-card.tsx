'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface EVMKPICardProps {
  title: string
  value: number
  unit?: 'currency' | 'percent' | 'number'
  previousValue?: number
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple'
  status?: 'good' | 'warning' | 'bad'
  subtitle?: string
}

export function EVMKPICard({
  title,
  value,
  unit = 'number',
  previousValue,
  icon,
  color = 'blue',
  status,
  subtitle,
}: EVMKPICardProps) {
  const formatValue = (v: number) => {
    if (unit === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
      }).format(v)
    } else if (unit === 'percent') {
      return `${(v * 100).toFixed(1)}%`
    }
    return v.toFixed(2)
  }

  const getTrendIcon = () => {
    if (!previousValue) return null
    const diff = value - previousValue
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getColorClasses = (c: string) => {
    const colors: Record<string, string> = {
      blue: 'border-l-4 border-l-blue-500',
      green: 'border-l-4 border-l-green-500',
      red: 'border-l-4 border-l-red-500',
      amber: 'border-l-4 border-l-amber-500',
      purple: 'border-l-4 border-l-purple-500',
    }
    return colors[c] || colors.blue
  }

  const getStatusColor = (s?: string) => {
    if (!s) return ''
    const colors: Record<string, string> = {
      good: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      bad: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    }
    return colors[s] || ''
  }

  return (
    <Card className={getColorClasses(color)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon ? (
          icon
        ) : (
          <div className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {getTrendIcon()}
          {status && (
            <Badge variant="outline" className={getStatusColor(status)}>
              {status === 'good' ? 'Bom' : status === 'warning' ? 'Atenção' : 'Crítico'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

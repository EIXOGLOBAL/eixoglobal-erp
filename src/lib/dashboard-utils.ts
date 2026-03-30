/**
 * Dashboard-related utilities and helpers
 */

export interface KPIData {
  label: string
  value: number
  change?: number
  changeDirection?: 'up' | 'down' | 'neutral'
  unit?: string
  trend?: number[]
}

export interface ChartDataPoint {
  label: string
  value: number
  [key: string]: any
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Determine trend direction
 */
export function getTrendDirection(change: number): 'up' | 'down' | 'neutral' {
  if (Math.abs(change) < 0.5) return 'neutral'
  return change > 0 ? 'up' : 'down'
}

/**
 * Format KPI data for display
 */
export function formatKPIData(
  label: string,
  value: number,
  previousValue?: number,
  unit?: string
): KPIData {
  const change = previousValue !== undefined
    ? calculatePercentageChange(value, previousValue)
    : undefined

  return {
    label,
    value,
    change,
    changeDirection: change !== undefined ? getTrendDirection(change) : undefined,
    unit,
  }
}

/**
 * Group data by time period
 */
export function groupByTimePeriod(
  data: Array<{ date: Date | string; value: number }>,
  period: 'day' | 'week' | 'month' | 'year'
): ChartDataPoint[] {
  const grouped: Record<string, number[]> = {}

  data.forEach(item => {
    const date = typeof item.date === 'string' ? new Date(item.date) : item.date
    let key = ''

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'year':
        key = `${date.getFullYear()}`
        break
    }

    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(item.value)
  })

  return Object.entries(grouped).map(([label, values]) => ({
    label,
    value: values.reduce((a, b) => a + b, 0) / values.length,
  }))
}

/**
 * Aggregate data by sum
 */
export function aggregateBySum(
  data: Array<{ category: string; value: number }>
): ChartDataPoint[] {
  const aggregated: Record<string, number> = {}

  data.forEach(item => {
    if (!aggregated[item.category]) {
      aggregated[item.category] = 0
    }
    aggregated[item.category] += item.value
  })

  return Object.entries(aggregated).map(([label, value]) => ({
    label,
    value,
  }))
}

/**
 * Get top N items by value
 */
export function getTopN<T extends Record<string, any>>(
  data: T[],
  valueKey: string,
  n: number = 5
): T[] {
  return data
    .sort((a, b) => (b[valueKey] as number) - (a[valueKey] as number))
    .slice(0, n)
}

/**
 * Calculate running total
 */
export function calculateRunningTotal(values: number[]): number[] {
  const runningTotal: number[] = []
  let total = 0

  values.forEach(value => {
    total += value
    runningTotal.push(total)
  })

  return runningTotal
}

/**
 * Generate color for chart based on value
 */
export function getColorForValue(value: number, max: number): string {
  const ratio = value / max
  if (ratio >= 0.8) return '#10b981' // green
  if (ratio >= 0.6) return '#3b82f6' // blue
  if (ratio >= 0.4) return '#f59e0b' // amber
  return '#ef4444' // red
}

/**
 * Generate status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Generate status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    PENDING: 'Pendente',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    IN_PROGRESS: 'Em Andamento',
    BLOCKED: 'Bloqueado',
    DRAFT: 'Rascunho',
  }
  return labels[status] || status
}

/**
 * Calculate dashboard metrics
 */
export interface DashboardMetrics {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalContracts: number
  totalEmployees: number
  totalClients: number
  totalValue: number
}

/**
 * Create health status based on metrics
 */
export function getHealthStatus(metrics: Partial<DashboardMetrics>): 'healthy' | 'warning' | 'critical' {
  if (!metrics.totalProjects) return 'critical'
  const completionRate = (metrics.completedProjects || 0) / (metrics.totalProjects || 1)
  if (completionRate >= 0.7) return 'healthy'
  if (completionRate >= 0.4) return 'warning'
  return 'critical'
}

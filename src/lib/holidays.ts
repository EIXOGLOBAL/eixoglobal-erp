export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  type: string
}

// Cache holidays in memory per year
const holidayCache: Record<number, Holiday[]> = {}

export async function getHolidays(year: number): Promise<Holiday[]> {
  if (holidayCache[year]) return holidayCache[year]

  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      next: { revalidate: 86400 } // cache 24h
    })
    if (!res.ok) return []
    const data = await res.json()
    holidayCache[year] = data
    return data
  } catch {
    return []
  }
}

export function isHoliday(date: Date | string, holidays: Holiday[]): Holiday | undefined {
  const d = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  return holidays.find(h => h.date === d)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isWorkday(date: Date, holidays: Holiday[]): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays)
}

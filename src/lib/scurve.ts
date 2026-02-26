import { SCurveDataPoint } from '@/components/projects/scurve-chart'

export interface TaskForCurve {
    id: string
    name: string
    startDate: Date | string | null
    endDate: Date | string | null
    plannedStart: Date | string | null
    plannedEnd: Date | string | null
    percentDone: number
    status: string
}

/**
 * Converts a Date | string | null to a Date object, or null if invalid.
 */
function toDate(value: Date | string | null): Date | null {
    if (value === null || value === undefined) return null
    const d = value instanceof Date ? value : new Date(value)
    return isNaN(d.getTime()) ? null : d
}

/**
 * Formats a Date as "Mmm/YY" in Brazilian Portuguese locale.
 * E.g. January 2025 → "Jan/25"
 */
function formatPeriod(date: Date): string {
    const month = date.toLocaleString('pt-BR', { month: 'short' })
    const capitalised = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '')
    const year = String(date.getFullYear()).slice(2)
    return `${capitalised}/${year}`
}

/**
 * Returns the last moment of the month for a given year/month.
 */
function endOfMonth(year: number, month: number): Date {
    // month is 0-indexed (like Date)
    return new Date(year, month + 1, 0, 23, 59, 59, 999)
}

/**
 * Returns the first day of the month for a given Date.
 */
function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Builds S-Curve data from project tasks.
 *
 * - Planned: cumulative % of tasks whose plannedEnd (fallback: endDate) falls on
 *   or before the end of each month.
 * - Actual: for months up to today, the average percentDone of tasks that have
 *   already started (startDate <= end of month), expressed as a 0-100 cumulative
 *   value. For future months, actual is null.
 *
 * @param tasks      Array of project tasks
 * @param projectStart  Project start date
 * @param projectEnd    Project end date (or today if ongoing)
 */
export function buildSCurveData(
    tasks: TaskForCurve[],
    projectStart: Date,
    projectEnd: Date,
): SCurveDataPoint[] {
    if (tasks.length === 0) return []

    const totalTasks = tasks.length
    const today = new Date()

    // Clamp projectEnd to a reasonable ceiling (avoid infinite loops)
    const effectiveEnd = projectEnd > today
        ? projectEnd  // project end is in the future — use it
        : today       // project already past due — show up to today

    // Generate month slots from projectStart to effectiveEnd (inclusive)
    const slots: { year: number; month: number }[] = []
    const cursor = startOfMonth(projectStart)

    while (
        cursor.getFullYear() < effectiveEnd.getFullYear() ||
        (cursor.getFullYear() === effectiveEnd.getFullYear() &&
            cursor.getMonth() <= effectiveEnd.getMonth())
    ) {
        slots.push({ year: cursor.getFullYear(), month: cursor.getMonth() })
        // Advance one month
        cursor.setMonth(cursor.getMonth() + 1)
    }

    // Edge case: no slots (e.g. projectStart > projectEnd)
    if (slots.length === 0) return []

    return slots.map(({ year, month }) => {
        const slotEnd = endOfMonth(year, month)
        const isFuture = slotEnd > today
        const period = formatPeriod(new Date(year, month, 1))

        // --- Planned ---
        // Count tasks whose planned completion (plannedEnd ?? endDate) <= slotEnd
        let plannedCount = 0
        for (const task of tasks) {
            const plannedEndDate = toDate(task.plannedEnd) ?? toDate(task.endDate)
            if (plannedEndDate !== null && plannedEndDate <= slotEnd) {
                plannedCount++
            }
        }
        const planned = (plannedCount / totalTasks) * 100

        // --- Actual ---
        // Only compute for past/current months
        if (isFuture) {
            return { period, planned, actual: null }
        }

        // Tasks that have started by the end of this month
        let startedCount = 0
        let sumPercent = 0
        for (const task of tasks) {
            const taskStart = toDate(task.startDate)
            if (taskStart !== null && taskStart <= slotEnd) {
                startedCount++
                sumPercent += task.percentDone
            }
        }

        // Actual: average percentDone of started tasks, then scale to total
        // This gives cumulative progress across the whole project scope
        let actual: number
        if (startedCount === 0) {
            actual = 0
        } else {
            // Average completion of started tasks, weighted by proportion that have started
            const avgDone = sumPercent / startedCount          // 0..100
            actual = (avgDone / 100) * (startedCount / totalTasks) * 100
        }

        return { period, planned, actual }
    })
}

'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditDiffViewProps {
  oldData: string | null
  newData: string | null
  /** Quando true, mostra todos os campos (inclusive inalterados). Padrão: false */
  showUnchanged?: boolean
}

interface FieldDiff {
  field: string
  oldValue: unknown
  newValue: unknown
  type: 'added' | 'removed' | 'modified'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseJSON(str: string | null): Record<string, unknown> | null {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(vazio)'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'
  if (value instanceof Date) return value.toLocaleString('pt-BR')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function computeDiff(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null
): FieldDiff[] {
  const diffs: FieldDiff[] = []

  const oldKeys = oldObj ? Object.keys(oldObj) : []
  const newKeys = newObj ? Object.keys(newObj) : []
  const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))

  for (const key of allKeys) {
    const inOld = oldObj !== null && key in oldObj
    const inNew = newObj !== null && key in newObj

    if (inOld && !inNew) {
      diffs.push({ field: key, oldValue: oldObj![key], newValue: undefined, type: 'removed' })
    } else if (!inOld && inNew) {
      diffs.push({ field: key, oldValue: undefined, newValue: newObj![key], type: 'added' })
    } else if (inOld && inNew) {
      const oldStr = JSON.stringify(oldObj![key])
      const newStr = JSON.stringify(newObj![key])
      if (oldStr !== newStr) {
        diffs.push({ field: key, oldValue: oldObj![key], newValue: newObj![key], type: 'modified' })
      }
    }
  }

  return diffs
}

// ---------------------------------------------------------------------------
// Formatador de nome de campo
// ---------------------------------------------------------------------------

/** Converte camelCase / snake_case em label legivel */
function formatFieldName(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditDiffView({ oldData, newData, showUnchanged = false }: AuditDiffViewProps) {
  const oldObj = safeParseJSON(oldData)
  const newObj = safeParseJSON(newData)

  if (!oldObj && !newObj) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">
        Nenhum dado de alteracao disponivel.
      </p>
    )
  }

  // CREATE: so tem newData
  if (!oldObj && newObj) {
    const keys = Object.keys(newObj)
    return (
      <div className="rounded-md border divide-y text-sm">
        {keys.map((key) => (
          <div key={key} className="flex items-start gap-3 px-3 py-2 bg-green-50 dark:bg-green-950/20">
            <span className="font-medium text-muted-foreground min-w-[140px] shrink-0">
              {formatFieldName(key)}
            </span>
            <span className="text-green-700 dark:text-green-400">
              {formatValue(newObj[key])}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // DELETE: so tem oldData
  if (oldObj && !newObj) {
    const keys = Object.keys(oldObj)
    return (
      <div className="rounded-md border divide-y text-sm">
        {keys.map((key) => (
          <div key={key} className="flex items-start gap-3 px-3 py-2 bg-red-50 dark:bg-red-950/20">
            <span className="font-medium text-muted-foreground min-w-[140px] shrink-0">
              {formatFieldName(key)}
            </span>
            <span className="text-red-700 dark:text-red-400 line-through">
              {formatValue(oldObj[key])}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // UPDATE: ambos existem — mostra diff
  const diffs = computeDiff(oldObj, newObj)

  if (diffs.length === 0 && !showUnchanged) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">
        Nenhuma diferenca detectada nos dados.
      </p>
    )
  }

  if (diffs.length === 0 && showUnchanged) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">
        Todos os campos permaneceram iguais.
      </p>
    )
  }

  return (
    <div className="rounded-md border divide-y text-sm">
      {diffs.map((diff) => (
        <div
          key={diff.field}
          className={cn(
            'flex items-start gap-3 px-3 py-2',
            diff.type === 'added' && 'bg-green-50 dark:bg-green-950/20',
            diff.type === 'removed' && 'bg-red-50 dark:bg-red-950/20',
            diff.type === 'modified' && 'bg-background'
          )}
        >
          <span className="font-medium text-muted-foreground min-w-[140px] shrink-0">
            {formatFieldName(diff.field)}
          </span>

          <div className="flex-1 min-w-0">
            {diff.type === 'added' && (
              <span className="text-green-700 dark:text-green-400">
                {formatValue(diff.newValue)}
              </span>
            )}

            {diff.type === 'removed' && (
              <span className="text-red-700 dark:text-red-400 line-through">
                {formatValue(diff.oldValue)}
              </span>
            )}

            {diff.type === 'modified' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded line-through">
                  {formatValue(diff.oldValue)}
                </span>
                <span className="text-muted-foreground text-xs">&rarr;</span>
                <span className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                  {formatValue(diff.newValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Buffer in-memory de erros para debug em produção (limpa quando o container reinicia)
type DebugError = { ts: string; where: string; message: string; code?: string; stack?: string }
const buf: DebugError[] = []
const MAX = 50

export function recordDebugError(where: string, e: any) {
  const entry: DebugError = {
    ts: new Date().toISOString(),
    where,
    message: e?.message ?? String(e),
    code: e?.code,
    stack: e?.stack,
  }
  buf.unshift(entry)
  if (buf.length > MAX) buf.pop()
  console.error(`[debug-errors] ${where}:`, entry.message, entry.code)
}

export function getDebugErrors(): DebugError[] {
  return [...buf]
}

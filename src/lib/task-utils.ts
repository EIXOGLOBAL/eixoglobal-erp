export type WorkTaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED"
export type WorkTaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE"

export const KANBAN_COLUMNS: { id: WorkTaskStatus; label: string; bgColor: string; headerBg: string }[] = [
  { id: "BACKLOG",     label: "Backlog",      bgColor: "bg-slate-50 dark:bg-slate-900/50", headerBg: "bg-slate-200 dark:bg-slate-700" },
  { id: "TODO",        label: "A Fazer",      bgColor: "bg-blue-50 dark:bg-blue-950/50",   headerBg: "bg-blue-200 dark:bg-blue-800" },
  { id: "IN_PROGRESS", label: "Em Andamento", bgColor: "bg-orange-50 dark:bg-orange-950/50", headerBg: "bg-orange-200 dark:bg-orange-800" },
  { id: "IN_REVIEW",   label: "Em Revisão",   bgColor: "bg-purple-50 dark:bg-purple-950/50", headerBg: "bg-purple-200 dark:bg-purple-800" },
  { id: "DONE",        label: "Concluído",    bgColor: "bg-green-50 dark:bg-green-950/50",  headerBg: "bg-green-200 dark:bg-green-800" },
  { id: "CANCELLED",   label: "Cancelado",    bgColor: "bg-red-50 dark:bg-red-950/50",      headerBg: "bg-red-200 dark:bg-red-800" },
]

export const STATUS_LABELS: Record<WorkTaskStatus, string> = {
  BACKLOG: "Backlog", TODO: "A Fazer", IN_PROGRESS: "Em Andamento",
  IN_REVIEW: "Em Revisão", DONE: "Concluído", CANCELLED: "Cancelado",
}

export const PRIORITY_LABELS: Record<WorkTaskPriority, string> = {
  CRITICAL: "Crítica", HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa", NONE: "Sem prioridade",
}

export const PRIORITY_DOT: Record<WorkTaskPriority, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-400",
  LOW: "bg-blue-400",
  NONE: "bg-gray-300",
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

export function formatDueDate(date: Date | string | null | undefined): { label: string; cls: string } | null {
  if (!date) return null
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, cls: "text-red-600 font-medium" }
  if (diff === 0) return { label: "Hoje", cls: "text-orange-500 font-medium" }
  if (diff === 1) return { label: "Amanhã", cls: "text-orange-400" }
  return { label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), cls: "text-muted-foreground" }
}

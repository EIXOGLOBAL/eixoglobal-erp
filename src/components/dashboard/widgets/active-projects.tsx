'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderKanban, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActiveProjectData } from '@/app/actions/dashboard-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  BIDDING: 'Licitacao',
  AWARDED: 'Adjudicado',
  COMPLETED: 'Concluido',
  ON_HOLD: 'Pausado',
  CANCELLED: 'Cancelado',
  HANDOVER: 'Entrega',
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
  BIDDING: 'bg-amber-100 text-amber-700',
  AWARDED: 'bg-purple-100 text-purple-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
}

function progressColor(value: number): string {
  if (value >= 75) return '[&>[data-slot=progress-indicator]]:bg-emerald-500'
  if (value >= 40) return '[&>[data-slot=progress-indicator]]:bg-amber-500'
  return '[&>[data-slot=progress-indicator]]:bg-blue-500'
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function ActiveProjectsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ActiveProjectsWidgetProps {
  projects: ActiveProjectData[]
  totalCount: number
  isLoading?: boolean
}

export function ActiveProjectsWidget({ projects, totalCount, isLoading }: ActiveProjectsWidgetProps) {
  if (isLoading) return <ActiveProjectsSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            Projetos Ativos
          </span>
          <Badge variant="secondary" className="text-xs">
            {totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum projeto ativo
          </p>
        ) : (
          <div className="space-y-4">
            {projects.map(project => (
              <Link
                key={project.id}
                href={`/projetos/${project.id}`}
                className="block group"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {project.code ? `${project.code} - ` : ''}{project.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                          STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-700',
                        )}
                      >
                        {STATUS_LABELS[project.status] || project.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {project.tasksDone}/{project.tasksTotal} tarefas
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground ml-2 shrink-0">
                    {project.progress}%
                  </span>
                </div>
                <Progress
                  value={project.progress}
                  className={cn('h-1.5', progressColor(project.progress))}
                />
              </Link>
            ))}
          </div>
        )}
      </CardContent>

      {totalCount > 5 && (
        <CardFooter className="border-t pt-4">
          <Link
            href="/projetos"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver todos os projetos
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}

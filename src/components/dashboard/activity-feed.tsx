'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/export-utils'
import { cn } from '@/lib/utils'
import {
  User,
  FileText,
  Folder,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react'

interface ActivityItem {
  id: string
  userId: string
  userName: string
  action: string
  resourceType: 'project' | 'contract' | 'employee' | 'measurement' | 'task'
  resourceName: string
  resourceId: string
  description: string
  status: 'success' | 'pending' | 'error'
  timestamp: Date | string
  metadata?: Record<string, any>
}

interface ActivityFeedProps {
  limit?: number
  className?: string
}

/**
 * Shows recent activity across the system
 * Timeline layout with icons and timestamps
 */
export function ActivityFeed({ limit = 10, className = '' }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/activities?limit=${limit}`)
        if (response.ok) {
          const data = await response.json()
          setActivities(data)
        }
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [limit])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4" />
      case 'updated':
      case 'edited':
        return <Edit className="h-4 w-4" />
      case 'deleted':
        return <Trash2 className="h-4 w-4" />
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getResourceIcon = (resourceType: ActivityItem['resourceType']) => {
    switch (resourceType) {
      case 'project':
        return <Folder className="h-4 w-4" />
      case 'employee':
        return <User className="h-4 w-4" />
      case 'contract':
      case 'measurement':
      case 'task':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getResourceLabel = (resourceType: ActivityItem['resourceType']) => {
    const labels = {
      project: 'Projeto',
      contract: 'Contrato',
      employee: 'Funcionário',
      measurement: 'Medição',
      task: 'Tarefa',
    }
    return labels[resourceType]
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'criou',
      updated: 'atualizou',
      edited: 'editou',
      deleted: 'deletou',
      approved: 'aprovou',
      rejected: 'rejeitou',
      viewed: 'visualizou',
    }
    return labels[action] || action
  }

  const getStatusColor = (status: ActivityItem['status']) => {
    const colors = {
      success: 'text-green-600 bg-green-50',
      pending: 'text-yellow-600 bg-yellow-50',
      error: 'text-red-600 bg-red-50',
    }
    return colors[status]
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma atividade ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                      getStatusColor(activity.status)
                    )}
                  >
                    {getActionIcon(activity.action)}
                  </div>
                  {index < activities.length - 1 && (
                    <div className="h-8 w-0.5 bg-muted my-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 py-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        <span className="font-semibold">{activity.userName}</span>
                        {' '}
                        <span>{getActionLabel(activity.action)}</span>
                        {' '}
                        <span className="inline-flex items-center gap-1">
                          {getResourceIcon(activity.resourceType)}
                          <span className="font-medium">{activity.resourceName}</span>
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(activity.timestamp)}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getResourceLabel(activity.resourceType)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

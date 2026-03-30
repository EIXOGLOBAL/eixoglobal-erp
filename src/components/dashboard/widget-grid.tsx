'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Settings, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WidgetType = 'kpis' | 'recent-projects' | 'financial' | 'tasks' | 'calendar' | 'insights'

interface WidgetGridProps {
  children?: React.ReactNode
  className?: string
}

interface WidgetConfig {
  id: WidgetType
  label: string
  visible: boolean
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'kpis', label: 'KPIs', visible: true },
  { id: 'recent-projects', label: 'Projetos Recentes', visible: true },
  { id: 'financial', label: 'Financeiro', visible: true },
  { id: 'tasks', label: 'Tarefas', visible: true },
  { id: 'calendar', label: 'Calendário', visible: false },
  { id: 'insights', label: 'IA Insights', visible: false },
]

const STORAGE_KEY = 'dashboard_widgets_config'

/**
 * Configurable widget grid for the dashboard
 * Users can toggle which widgets are visible
 * Responsive grid layout with localStorage persistence
 */
export function WidgetGrid({ children, className = '' }: WidgetGridProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load widget configuration from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setWidgets(prev =>
          prev.map(widget => ({
            ...widget,
            visible: parsed[widget.id] !== undefined ? parsed[widget.id] : widget.visible,
          }))
        )
      }
    } catch (error) {
      console.error('Error loading widget config:', error)
    } finally {
      setIsLoading(false)
      setIsHydrated(true)
    }
  }, [])

  // Save widget configuration to localStorage
  const saveWidgetConfig = useCallback((updatedWidgets: WidgetConfig[]) => {
    try {
      const config = updatedWidgets.reduce(
        (acc, widget) => ({
          ...acc,
          [widget.id]: widget.visible,
        }),
        {}
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Error saving widget config:', error)
    }
  }, [])

  const toggleWidget = useCallback((widgetId: WidgetType) => {
    setWidgets(prev => {
      const updated = prev.map(widget =>
        widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
      )
      saveWidgetConfig(updated)
      return updated
    })
  }, [saveWidgetConfig])

  const resetWidgets = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS)
    saveWidgetConfig(DEFAULT_WIDGETS)
  }, [saveWidgetConfig])

  const visibleCount = widgets.filter(w => w.visible).length

  if (!isHydrated) {
    return null
  }

  return (
    <div className={className}>
      {/* Widget Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <span className="text-sm text-muted-foreground">
            {visibleCount} de {widgets.length} widgets visíveis
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Widgets
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Mostrar/Ocultar Widgets
              </p>
            </div>
            {widgets.map(widget => (
              <DropdownMenuCheckboxItem
                key={widget.id}
                checked={widget.visible}
                onCheckedChange={() => toggleWidget(widget.id)}
              >
                {widget.visible ? (
                  <Eye className="h-3 w-3 mr-2" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-2" />
                )}
                {widget.label}
              </DropdownMenuCheckboxItem>
            ))}
            <div className="border-t my-2" />
            <DropdownMenuItem onClick={resetWidgets} className="text-xs">
              Restaurar padrão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
        {children}
      </div>
    </div>
  )
}

/**
 * Widget wrapper component
 */
interface WidgetProps {
  id: WidgetType
  title: string
  children: React.ReactNode
  className?: string
  isVisible?: boolean
}

export function Widget({
  id,
  title,
  children,
  className = '',
  isVisible = true,
}: WidgetProps) {
  if (!isVisible) {
    return null
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * Hook to get widget visibility state
 */
export function useWidgetVisibility() {
  const defaultWidgets: Record<WidgetType, boolean> = {
    'kpis': true,
    'recent-projects': true,
    'financial': true,
    'tasks': true,
    'calendar': false,
    'insights': false,
  }
  const [widgets, setWidgets] = useState<Record<WidgetType, boolean>>(defaultWidgets)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setWidgets(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading widget config:', error)
    }
    setIsHydrated(true)
  }, [])

  return { isHydrated, widgets }
}

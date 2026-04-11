import { getProjectsForMap } from '@/app/actions/map-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { MapWrapper } from '@/components/map/map-wrapper'

export const dynamic = "force-dynamic"

export default async function MapaPage() {
  const projects = await getProjectsForMap()

  const withCoords = projects.filter(p => p.latitude != null && p.longitude != null)
  const statusCounts = {
    PLANNING: projects.filter(p => p.status === 'PLANNING').length,
    IN_PROGRESS: projects.filter(p => p.status === 'IN_PROGRESS').length,
    COMPLETED: projects.filter(p => p.status === 'COMPLETED').length,
    ON_HOLD: projects.filter(p => p.status === 'ON_HOLD').length,
    CANCELLED: projects.filter(p => p.status === 'CANCELLED').length,
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-6 w-6" />
        <h2 className="text-3xl font-bold tracking-tight">Mapa de Obras</h2>
      </div>

      {/* KPI Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{projects.length} projetos total</Badge>
        <Badge variant="outline">{withCoords.length} no mapa</Badge>
        <Badge className="bg-blue-500 text-white">{statusCounts.IN_PROGRESS} em andamento</Badge>
        <Badge variant="secondary">{statusCounts.PLANNING} planejamento</Badge>
        <Badge className="bg-green-500 text-white">{statusCounts.COMPLETED} concluídos</Badge>
        {statusCounts.ON_HOLD > 0 && (
          <Badge className="bg-amber-500 text-white">{statusCounts.ON_HOLD} em espera</Badge>
        )}
        {statusCounts.CANCELLED > 0 && (
          <Badge className="bg-red-500 text-white">{statusCounts.CANCELLED} cancelados</Badge>
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
              Planejamento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              Em Andamento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              Concluído
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              Em Espera
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              Cancelado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Map - uses client wrapper with dynamic import (ssr: false) */}
      <MapWrapper projects={projects} />

      {withCoords.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum projeto possui coordenadas cadastradas.</p>
            <p className="text-sm mt-1">
              Edite um projeto e adicione latitude/longitude para visualizá-lo no mapa.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

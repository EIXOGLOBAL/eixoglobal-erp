'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const statusColors: Record<string, string> = {
  PLANNING: '#6b7280',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
  ON_HOLD: '#f59e0b',
}

const statusLabels: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  ON_HOLD: 'Em Espera',
}

// Fix Leaflet default icon in Next.js
const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

function createColoredPin(color: string) {
  return L.divIcon({
    html: `<div style="
      width: 24px; height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  })
}

interface ProjectsMapProps {
  projects: Array<{
    id: string
    name: string
    status: string
    latitude: number | null
    longitude: number | null
    startDate: Date
    endDate: Date | null
    budget: number | null
    company: { id: string; name: string } | null
    _count: { measurements: number }
  }>
}

export function ProjectsMap({ projects }: ProjectsMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    fixLeafletIcons()
    setMounted(true)
  }, [])

  const withCoords = projects.filter(p => p.latitude != null && p.longitude != null)
  const withoutCoords = projects.filter(p => p.latitude == null || p.longitude == null)

  if (!mounted) return <div className="h-[600px] bg-muted rounded-lg animate-pulse" />

  return (
    <div className="flex gap-4">
      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border h-[600px]">
        <MapContainer
          center={[-14.235, -51.925]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {withCoords.map(project => (
            <Marker
              key={project.id}
              position={[project.latitude!, project.longitude!]}
              icon={createColoredPin(statusColors[project.status] ?? '#6b7280')}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>{project.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                    {project.company?.name}
                  </p>
                  <p style={{ color: statusColors[project.status], fontSize: '0.875rem', marginBottom: '4px' }}>
                    {statusLabels[project.status] ?? project.status}
                  </p>
                  <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Number(project.budget || 0)
                    )}
                  </p>
                  <a
                    href={`/projects/${project.id}`}
                    style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}
                  >
                    Ver Projeto &rarr;
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Sidebar - projects without coordinates */}
      {withoutCoords.length > 0 && (
        <div className="w-72 flex flex-col gap-2 overflow-y-auto max-h-[600px]">
          <p className="text-sm font-medium text-muted-foreground">
            {withoutCoords.length} projeto(s) sem localização
          </p>
          {withoutCoords.map(project => (
            <a
              key={project.id}
              href={`/projects/${project.id}`}
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <p className="font-medium text-sm">{project.name}</p>
              <p className="text-xs text-muted-foreground">{project.company?.name}</p>
              <span className="text-xs" style={{ color: statusColors[project.status] ?? '#6b7280' }}>
                {statusLabels[project.status] ?? project.status}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

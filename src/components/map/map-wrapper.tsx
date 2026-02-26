'use client'

import dynamic from 'next/dynamic'

// Dynamic import to prevent SSR issues with Leaflet - must be in a client component
const ProjectsMap = dynamic(
  () => import('@/components/map/projects-map').then(m => m.ProjectsMap),
  {
    ssr: false,
    loading: () => <div className="h-[600px] bg-muted rounded-lg animate-pulse" />,
  }
)

interface MapWrapperProps {
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

export function MapWrapper({ projects }: MapWrapperProps) {
  return <ProjectsMap projects={projects} />
}

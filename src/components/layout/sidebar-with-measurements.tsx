'use client'

import { Sidebar } from "./sidebar"
import type { ModulePermissions } from "./sidebar"
import { MeasurementsSidebarStats } from "@/components/bulletins/measurements-sidebar-stats"
import { useEffect, useState } from "react"

interface SidebarWithMeasurementsProps {
    userRole?: string
    modulePermissions?: ModulePermissions
}

export function SidebarWithMeasurements({ userRole = 'USER', modulePermissions = {} }: SidebarWithMeasurementsProps) {
    const [stats, setStats] = useState({
        pendingCount: 0,
        draftCount: 0,
        approvedCount: 0,
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Fetch measurement stats
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/measurements/stats')
                if (response.ok) {
                    const data = await response.json()
                    setStats(data)
                }
            } catch (error) {
                console.error('Error fetching measurement stats:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [])

    return (
        <div className="flex flex-col h-full">
            <Sidebar userRole={userRole} modulePermissions={modulePermissions} />

            {/* Quick Stats Section - Only shown if there's data */}
            {!isLoading && (stats.pendingCount > 0 || stats.draftCount > 0) && (
                <div className="px-3 py-4 border-t">
                    <MeasurementsSidebarStats
                        pendingCount={stats.pendingCount}
                        draftCount={stats.draftCount}
                        approvedCount={stats.approvedCount}
                    />
                </div>
            )}
        </div>
    )
}

import { getEquipmentById } from '@/app/actions/equipment-actions'
import { getProjects } from '@/app/actions/project-actions'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Truck, Wrench, Calendar, DollarSign, Tag, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { EquipmentDialog } from '@/components/equipamentos/equipment-dialog'
import { UsageDialog } from '@/components/equipamentos/usage-dialog'
import { MaintenanceDialog } from '@/components/equipamentos/maintenance-dialog'
import { EquipmentDetailClient } from '@/components/equipamentos/equipment-detail-client'

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
    VEHICLE: "Veículo", CRANE: "Guindaste/Grua", EXCAVATOR: "Escavadeira",
    CONCRETE_MIXER: "Betoneira", COMPRESSOR: "Compressor", GENERATOR: "Gerador",
    SCAFFOLD: "Andaime", FORMWORK: "Forma/Escoramento", PUMP: "Bomba",
    TOOL: "Ferramenta", OTHER: "Outro",
}
const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
    AVAILABLE: "Disponível", IN_USE: "Em Uso", MAINTENANCE: "Em Manutenção",
    INACTIVE: "Inativo", RENTED_OUT: "Locado",
}
const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800 border-green-200",
    IN_USE: "bg-blue-100 text-blue-800 border-blue-200",
    MAINTENANCE: "bg-orange-100 text-orange-800 border-orange-200",
    INACTIVE: "bg-gray-100 text-gray-800 border-gray-200",
    RENTED_OUT: "bg-purple-100 text-purple-800 border-purple-200",
}
const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
    PREVENTIVE: "Preventiva", CORRECTIVE: "Corretiva", INSPECTION: "Inspeção",
}
const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'
interface PageProps { params: Promise<{ id: string }> }
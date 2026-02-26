import { Building2, Truck, Zap, Package, Home, Warehouse, Car, Bike, Anchor, Shovel, Hammer, Droplets, Wind, Flame, LayoutGrid } from 'lucide-react'

export const RENTAL_TYPE_GROUPS: Record<string, string[]> = {
  'Imóveis': ['PROPERTY_RESIDENTIAL', 'PROPERTY_COMMERCIAL', 'PROPERTY_WAREHOUSE'],
  'Veículos': ['VEHICLE_TRUCK', 'VEHICLE_VAN', 'VEHICLE_CAR', 'VEHICLE_MOTORCYCLE'],
  'Equipamentos Grandes': ['EQUIPMENT_CRANE', 'EQUIPMENT_EXCAVATOR', 'EQUIPMENT_BULLDOZER', 'EQUIPMENT_MIXER', 'EQUIPMENT_COMPRESSOR'],
  'Equipamentos Pequenos': ['EQUIPMENT_GENERATOR', 'EQUIPMENT_COMPACTOR', 'EQUIPMENT_PUMP', 'EQUIPMENT_WELDER', 'EQUIPMENT_SCAFFOLD'],
  'Outros': ['OTHER'],
}

export const RENTAL_TYPE_LABELS: Record<string, string> = {
  PROPERTY_RESIDENTIAL: 'Residência/Alojamento',
  PROPERTY_COMMERCIAL: 'Sala Comercial',
  PROPERTY_WAREHOUSE: 'Galpão/Almoxarifado',
  VEHICLE_TRUCK: 'Caminhão',
  VEHICLE_VAN: 'Van/Kombi',
  VEHICLE_CAR: 'Carro de Passeio',
  VEHICLE_MOTORCYCLE: 'Motocicleta',
  EQUIPMENT_CRANE: 'Guindaste/Grua',
  EQUIPMENT_EXCAVATOR: 'Escavadeira',
  EQUIPMENT_BULLDOZER: 'Trator/Buldôzer',
  EQUIPMENT_MIXER: 'Betoneira',
  EQUIPMENT_COMPRESSOR: 'Compressor de Ar',
  EQUIPMENT_GENERATOR: 'Gerador',
  EQUIPMENT_COMPACTOR: 'Compactador de Solo',
  EQUIPMENT_PUMP: 'Motobomba',
  EQUIPMENT_WELDER: 'Máquina de Solda',
  EQUIPMENT_SCAFFOLD: 'Andaime',
  OTHER: 'Outro',
}

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
}

export const RENTAL_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  RETURNED: 'Devolvido',
  OVERDUE: 'Em Atraso',
  CANCELLED: 'Cancelado',
}

export type RentalTypeKey =
  | 'PROPERTY_RESIDENTIAL'
  | 'PROPERTY_COMMERCIAL'
  | 'PROPERTY_WAREHOUSE'
  | 'VEHICLE_TRUCK'
  | 'VEHICLE_VAN'
  | 'VEHICLE_CAR'
  | 'VEHICLE_MOTORCYCLE'
  | 'EQUIPMENT_CRANE'
  | 'EQUIPMENT_EXCAVATOR'
  | 'EQUIPMENT_BULLDOZER'
  | 'EQUIPMENT_MIXER'
  | 'EQUIPMENT_COMPRESSOR'
  | 'EQUIPMENT_GENERATOR'
  | 'EQUIPMENT_COMPACTOR'
  | 'EQUIPMENT_PUMP'
  | 'EQUIPMENT_WELDER'
  | 'EQUIPMENT_SCAFFOLD'
  | 'OTHER'

type IconComponent = React.FC<{ className?: string }>

export const RENTAL_TYPE_ICONS: Record<RentalTypeKey, IconComponent> = {
  PROPERTY_RESIDENTIAL: Home,
  PROPERTY_COMMERCIAL: Building2,
  PROPERTY_WAREHOUSE: Warehouse,
  VEHICLE_TRUCK: Truck,
  VEHICLE_VAN: Truck,
  VEHICLE_CAR: Car,
  VEHICLE_MOTORCYCLE: Bike,
  EQUIPMENT_CRANE: Anchor,
  EQUIPMENT_EXCAVATOR: Shovel,
  EQUIPMENT_BULLDOZER: Hammer,
  EQUIPMENT_MIXER: LayoutGrid,
  EQUIPMENT_COMPRESSOR: Wind,
  EQUIPMENT_GENERATOR: Zap,
  EQUIPMENT_COMPACTOR: Hammer,
  EQUIPMENT_PUMP: Droplets,
  EQUIPMENT_WELDER: Flame,
  EQUIPMENT_SCAFFOLD: Package,
  OTHER: Package,
}

export function getRentalTypeIcon(type: string) {
  return RENTAL_TYPE_ICONS[type as RentalTypeKey] ?? Package
}

export function getRentalTypeLabel(type: string): string {
  return RENTAL_TYPE_LABELS[type] ?? type
}

export function getBillingCycleLabel(cycle: string): string {
  return BILLING_CYCLE_LABELS[cycle] ?? cycle
}

export function getRentalStatusLabel(status: string): string {
  return RENTAL_STATUS_LABELS[status] ?? status
}

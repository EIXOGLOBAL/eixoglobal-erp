import {
  Truck, Wrench, Gauge, Zap, HardHat, Package,
  Settings, Drill, Building, Car, Bus
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Map equipment types to lucide icons + emoji (for visual variety)
export type EquipmentType = string

interface EquipmentIconConfig {
  icon: LucideIcon
  emoji: string
  color: string // tailwind text color
  bgColor: string // tailwind bg color
}

const EQUIPMENT_ICON_MAP: Record<string, EquipmentIconConfig> = {
  // Heavy machinery
  EXCAVATOR:      { icon: HardHat,  emoji: '🏗️', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  BACKHOE:        { icon: HardHat,  emoji: '🚜', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  BULLDOZER:      { icon: HardHat,  emoji: '🚧', color: 'text-amber-600',  bgColor: 'bg-amber-100' },
  CRANE:          { icon: Building, emoji: '🏗️', color: 'text-blue-600',   bgColor: 'bg-blue-100' },
  COMPACTOR:      { icon: Settings, emoji: '⚙️',  color: 'text-gray-600',   bgColor: 'bg-gray-100' },
  LOADER:         { icon: Package,  emoji: '🚧', color: 'text-orange-500', bgColor: 'bg-orange-50' },
  SCAFFOLD:       { icon: Building, emoji: '🏗️', color: 'text-slate-600',  bgColor: 'bg-slate-100' },
  FORMWORK:       { icon: Settings, emoji: '🔩', color: 'text-stone-600',  bgColor: 'bg-stone-100' },
  
  // Vehicles
  VEHICLE:        { icon: Truck,  emoji: '🚛', color: 'text-blue-700',   bgColor: 'bg-blue-100' },
  TRUCK:          { icon: Truck,  emoji: '🚛', color: 'text-blue-700',   bgColor: 'bg-blue-100' },
  DUMP_TRUCK:     { icon: Truck,  emoji: '🚚', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  PICKUP:         { icon: Car,    emoji: '🚗', color: 'text-slate-600',  bgColor: 'bg-slate-100' },
  VAN:            { icon: Bus,    emoji: '🚐', color: 'text-slate-500',  bgColor: 'bg-slate-50' },
  
  // Tools & equipment
  GENERATOR:      { icon: Zap,      emoji: '⚡', color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  COMPRESSOR:     { icon: Gauge,    emoji: '🔧', color: 'text-gray-600',   bgColor: 'bg-gray-100' },
  CONCRETE_MIXER: { icon: Settings, emoji: '🔄', color: 'text-stone-600',  bgColor: 'bg-stone-100' },
  DRILL:          { icon: Drill,    emoji: '🔩', color: 'text-red-600',    bgColor: 'bg-red-100' },
  TOOL:           { icon: Wrench,   emoji: '🔧', color: 'text-gray-600',   bgColor: 'bg-gray-100' },
  WELDING:        { icon: Wrench,   emoji: '🔥', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  PUMP:           { icon: Gauge,    emoji: '💧', color: 'text-cyan-600',   bgColor: 'bg-cyan-100' },
  
  // Default
  OTHER:          { icon: Settings, emoji: '🔧', color: 'text-gray-500',   bgColor: 'bg-gray-100' },
}

export function getEquipmentIconConfig(type: string): EquipmentIconConfig {
  // Try exact match first, then case-insensitive
  const key = Object.keys(EQUIPMENT_ICON_MAP).find(
    k => k === type || k.toLowerCase() === type?.toLowerCase()
  )
  return EQUIPMENT_ICON_MAP[key ?? 'OTHER']!
}

// Translates common Portuguese equipment names to our type keys
const PT_TO_TYPE: Record<string, string> = {
  'retroescavadeira': 'BACKHOE',
  'escavadeira': 'EXCAVATOR',
  'caminhão': 'TRUCK',
  'caminhao': 'TRUCK',
  'carreta': 'DUMP_TRUCK',
  'caçamba': 'DUMP_TRUCK',
  'cacamba': 'DUMP_TRUCK',
  'grua': 'CRANE',
  'guindaste': 'CRANE',
  'trator': 'BULLDOZER',
  'compactador': 'COMPACTOR',
  'gerador': 'GENERATOR',
  'compressor': 'COMPRESSOR',
  'betoneira': 'CONCRETE_MIXER',
  'bomba': 'PUMP',
  'furadeira': 'DRILL',
  'soldagem': 'WELDING',
  'pá carregadeira': 'LOADER',
  'pickup': 'PICKUP',
  'van': 'VAN',
  'andaime': 'SCAFFOLD',
  'forma': 'FORMWORK',
  'escoramento': 'FORMWORK',
  'veículo': 'VEHICLE',
  'veiculo': 'VEHICLE',
  'ferramenta': 'TOOL',
}

export function resolveEquipmentType(nameOrType: string): string {
  const lower = nameOrType.toLowerCase().trim()
  for (const [pt, type] of Object.entries(PT_TO_TYPE)) {
    if (lower.includes(pt)) return type
  }
  return nameOrType.toUpperCase().replace(/\s+/g, '_')
}

// React component for displaying the equipment icon
interface EquipmentIconProps {
  type: string
  name?: string // If type is not a known key, try to detect from name
  size?: 'sm' | 'md' | 'lg'
  showEmoji?: boolean
  className?: string
}

export function EquipmentIcon({ type, name, size = 'md', showEmoji = false, className }: EquipmentIconProps) {
  const resolvedType = type ? resolveEquipmentType(type) : (name ? resolveEquipmentType(name) : 'OTHER')
  const config = getEquipmentIconConfig(resolvedType)
  const Icon = config.icon

  const sizeClasses = {
    sm: 'w-7 h-7 text-lg',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-14 h-14 text-4xl',
  }
  const iconSizes = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-7 w-7' }

  if (showEmoji) {
    return (
      <div className={`flex items-center justify-center rounded-xl ${config.bgColor} ${sizeClasses[size]} ${className ?? ''}`}>
        <span className="leading-none">{config.emoji}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center rounded-xl ${config.bgColor} ${sizeClasses[size]} ${className ?? ''}`}>
      <Icon className={`${iconSizes[size]} ${config.color}`} />
    </div>
  )
}

// Alias for backward compatibility
export const EquipmentIconBadge = EquipmentIcon

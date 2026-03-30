'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Filter, X } from 'lucide-react'

interface ContractsFilterPanelProps {
  projects: Array<{ id: string; name: string }>
  contractors: Array<{ id: string; name: string }>
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  search: string
  status: string
  projectIds: string[]
  contractorIds: string[]
  valueMin?: number
  valueMax?: number
}

const statusOptions = [
  { value: 'ALL', label: 'Todos os Status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export function ContractsFilterPanel({
  projects,
  contractors,
  onFilterChange,
}: ContractsFilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'ALL',
    projectIds: [],
    contractorIds: [],
  })

  const [isOpen, setIsOpen] = useState(false)

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const handleProjectToggle = (projectId: string) => {
    const updated = filters.projectIds.includes(projectId)
      ? filters.projectIds.filter(id => id !== projectId)
      : [...filters.projectIds, projectId]
    handleFilterChange({ projectIds: updated })
  }

  const handleContractorToggle = (contractorId: string) => {
    const updated = filters.contractorIds.includes(contractorId)
      ? filters.contractorIds.filter(id => id !== contractorId)
      : [...filters.contractorIds, contractorId]
    handleFilterChange({ contractorIds: updated })
  }

  const activeFilters =
    (filters.projectIds?.length || 0) +
    (filters.contractorIds?.length || 0) +
    (filters.status !== 'ALL' ? 1 : 0)

  const handleReset = () => {
    const resetFilters: FilterState = {
      search: '',
      status: 'ALL',
      projectIds: [],
      contractorIds: [],
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilters > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
              {activeFilters}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
          <SheetDescription>
            Refine os contratos por vários critérios
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">
              Buscar
            </Label>
            <Input
              id="search"
              placeholder="Identificador, projeto..."
              value={filters.search}
              onChange={e => handleFilterChange({ search: e.target.value })}
            />
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={filters.status} onValueChange={status => handleFilterChange({ status })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Projects Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Projetos</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {projects.map(project => (
                <div key={project.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`project-${project.id}`}
                    checked={filters.projectIds?.includes(project.id) || false}
                    onCheckedChange={() => handleProjectToggle(project.id)}
                  />
                  <Label
                    htmlFor={`project-${project.id}`}
                    className="font-normal cursor-pointer text-sm"
                  >
                    {project.name}
                  </Label>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum projeto disponível</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Contractors Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Contratadas</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {contractors.map(contractor => (
                <div key={contractor.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`contractor-${contractor.id}`}
                    checked={filters.contractorIds?.includes(contractor.id) || false}
                    onCheckedChange={() => handleContractorToggle(contractor.id)}
                  />
                  <Label
                    htmlFor={`contractor-${contractor.id}`}
                    className="font-normal cursor-pointer text-sm"
                  >
                    {contractor.name}
                  </Label>
                </div>
              ))}
              {contractors.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma contratada disponível</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <Separator className="my-4" />
        <div className="flex gap-2">
          {activeFilters > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setIsOpen(false)}
            className={activeFilters > 0 ? 'flex-1' : 'w-full'}
          >
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

interface FilterPanelProps {
  onSearch?: (value: string) => void
  onStatusChange?: (status: string) => void
  onDateRangeChange?: (startDate: string, endDate: string) => void
  onClear?: () => void
  statusOptions?: { value: string; label: string }[]
  showDateRange?: boolean
  placeholderText?: string
}

export function FilterPanel({
  onSearch,
  onStatusChange,
  onDateRangeChange,
  onClear,
  statusOptions = [],
  showDateRange = false,
  placeholderText = 'Pesquisar...',
}: FilterPanelProps) {
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleSearch = (value: string) => {
    setSearchValue(value)
    onSearch?.(value)
  }

  const handleStatusChange = (value: string) => {
    setStatusValue(value)
    onStatusChange?.(value)
  }

  const handleDateRangeChange = () => {
    onDateRangeChange?.(startDate, endDate)
  }

  const handleClear = () => {
    setSearchValue('')
    setStatusValue('')
    setStartDate('')
    setEndDate('')
    onClear?.()
  }

  const hasFilters = searchValue || statusValue || startDate || endDate

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholderText}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Select */}
        {statusOptions.length > 0 && (
          <Select value={statusValue} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um status..." />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Range */}
        {showDateRange && (
          <div className="flex gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Data inicial"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Data final"
            />
            <Button onClick={handleDateRangeChange} variant="outline" size="sm">
              Aplicar
            </Button>
          </div>
        )}
      </div>

      {/* Clear Button */}
      {hasFilters && (
        <Button
          onClick={handleClear}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          <X className="h-4 w-4" />
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Folder,
  FileText,
  User,
  Building2,
  Truck,
  Clock,
  Search,
} from 'lucide-react'
import { globalSearch, type SearchResponse } from '@/app/actions/search-actions'
import { cn } from '@/lib/utils'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Global search dialog triggered by Ctrl+K
 * Groups results by type with icons and subtitles
 */
export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse>({
    projects: [],
    contracts: [],
    employees: [],
    clients: [],
    suppliers: [],
  })
  const [isLoading, setIsLoading] = useState(false)

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Search with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults({
          projects: [],
          contracts: [],
          employees: [],
          clients: [],
          suppliers: [],
        })
        return
      }

      setIsLoading(true)
      try {
        const response = await globalSearch(query)
        setResults(response)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (url: string) => {
    router.push(url)
    onOpenChange(false)
  }

  const hasResults = Object.values(results).some(arr => arr.length > 0)

  const iconMap = {
    project: <Folder className="h-4 w-4" />,
    contract: <FileText className="h-4 w-4" />,
    employee: <User className="h-4 w-4" />,
    client: <Building2 className="h-4 w-4" />,
    supplier: <Truck className="h-4 w-4" />,
  }

  const labels = {
    projects: 'Projetos',
    contracts: 'Contratos',
    employees: 'Funcionários',
    clients: 'Clientes',
    suppliers: 'Fornecedores',
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar projetos, contratos, funcionários, clientes, fornecedores..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Buscando...
          </div>
        )}
        {!isLoading && query.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Search className="mx-auto h-4 w-4 mb-2 opacity-50" />
            Digite ao menos 2 caracteres para buscar
          </div>
        )}
        {!isLoading && query.length >= 2 && !hasResults && (
          <CommandEmpty>Nenhum resultado encontrado para "{query}"</CommandEmpty>
        )}

        {!isLoading && query.length >= 2 && hasResults && (
          <>
            {results.projects.length > 0 && (
              <CommandGroup heading={labels.projects}>
                {results.projects.map(result => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.id}
                    onSelect={() => handleSelect(result.url)}
                    className="cursor-pointer"
                  >
                    {iconMap.project}
                    <div className="flex flex-col flex-1 ml-2">
                      <span className="font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.contracts.length > 0 && (
              <CommandGroup heading={labels.contracts}>
                {results.contracts.map(result => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.id}
                    onSelect={() => handleSelect(result.url)}
                    className="cursor-pointer"
                  >
                    {iconMap.contract}
                    <div className="flex flex-col flex-1 ml-2">
                      <span className="font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.employees.length > 0 && (
              <CommandGroup heading={labels.employees}>
                {results.employees.map(result => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.id}
                    onSelect={() => handleSelect(result.url)}
                    className="cursor-pointer"
                  >
                    {iconMap.employee}
                    <div className="flex flex-col flex-1 ml-2">
                      <span className="font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.clients.length > 0 && (
              <CommandGroup heading={labels.clients}>
                {results.clients.map(result => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.id}
                    onSelect={() => handleSelect(result.url)}
                    className="cursor-pointer"
                  >
                    {iconMap.client}
                    <div className="flex flex-col flex-1 ml-2">
                      <span className="font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.suppliers.length > 0 && (
              <CommandGroup heading={labels.suppliers}>
                {results.suppliers.map(result => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.id}
                    onSelect={() => handleSelect(result.url)}
                    className="cursor-pointer"
                  >
                    {iconMap.supplier}
                    <div className="flex flex-col flex-1 ml-2">
                      <span className="font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>

      {/* Keyboard shortcut hint */}
      <div className="border-t px-2 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-end gap-1">
          <kbd className="rounded border bg-muted px-1 font-mono text-[11px]">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="rounded border bg-muted px-1 font-mono text-[11px]">
            K
          </kbd>
        </div>
      </div>
    </CommandDialog>
  )
}

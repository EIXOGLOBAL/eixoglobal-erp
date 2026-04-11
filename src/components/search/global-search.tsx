"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  X,
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  Wrench,
  UserCog,
  Clock,
  Loader2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  href: string
  category: string
}

interface SearchResponse {
  results: Record<string, SearchResult[]>
  total: number
}

interface RecentSearch {
  term: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 300
const MIN_CHARS = 2
const MAX_RECENT = 5
const RECENT_KEY = "erp-recent-searches"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Clientes: <Users className="h-4 w-4" />,
  Projetos: <FolderKanban className="h-4 w-4" />,
  Contratos: <FileText className="h-4 w-4" />,
  Financeiro: <DollarSign className="h-4 w-4" />,
  Equipamentos: <Wrench className="h-4 w-4" />,
  "Usuários": <UserCog className="h-4 w-4" />,
}

// ---------------------------------------------------------------------------
// Helpers para buscas recentes
// ---------------------------------------------------------------------------

function loadRecent(): RecentSearch[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as RecentSearch[]) : []
  } catch {
    return []
  }
}

function saveRecent(term: string) {
  if (typeof window === "undefined") return
  try {
    const list = loadRecent().filter((r) => r.term !== term)
    list.unshift({ term, timestamp: Date.now() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
  } catch {
    // Silenciar erros de storage
  }
}

function clearRecent() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {
    // Silenciar
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  // Carregar buscas recentes ao montar
  useEffect(() => {
    setRecentSearches(loadRecent())
  }, [])

  // Flatten dos resultados para navegação por teclado
  const flatResults: SearchResult[] = data
    ? Object.values(data.results).flat()
    : []

  // ------- Debounce da busca -------
  useEffect(() => {
    if (query.length < MIN_CHARS) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setActiveIndex(-1)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=all`
        )
        if (res.ok) {
          const json: SearchResponse = await res.json()
          setData(json)
        } else {
          setData(null)
        }
      } catch {
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  // ------- Fechar ao clicar fora -------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ------- Atalho global Ctrl/Cmd+K -------
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    document.addEventListener("keydown", handleGlobalKey)
    return () => document.removeEventListener("keydown", handleGlobalKey)
  }, [])

  // ------- Navegar para resultado -------
  const navigateTo = useCallback(
    (href: string, term?: string) => {
      if (term) saveRecent(term)
      setIsOpen(false)
      setQuery("")
      setData(null)
      router.push(href)
    },
    [router]
  )

  // ------- Teclado dentro do input -------
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false)
      inputRef.current?.blur()
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev < flatResults.length - 1 ? prev + 1 : 0
      )
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : flatResults.length - 1
      )
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        navigateTo(flatResults[activeIndex].href, query)
      }
      return
    }
  }

  // ------- Busca recente clicada -------
  function handleRecentClick(term: string) {
    setQuery(term)
    inputRef.current?.focus()
  }

  function handleClearRecent() {
    clearRecent()
    setRecentSearches([])
  }

  // ------- Estado do dropdown -------
  const showDropdown = isOpen && (query.length >= MIN_CHARS || recentSearches.length > 0)
  const showRecent = isOpen && query.length < MIN_CHARS && recentSearches.length > 0
  const showResults = isOpen && query.length >= MIN_CHARS
  const hasResults = data && data.total > 0
  const noResults = showResults && !isLoading && data && data.total === 0

  // Rastrear índice acumulado para highlight
  let runningIndex = 0

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Input de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => {
            setIsOpen(true)
            setRecentSearches(loadRecent())
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar... (Ctrl+K)"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Busca global"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setData(null)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover shadow-lg"
          role="listbox"
        >
          {/* Buscas recentes */}
          {showRecent && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Buscas recentes
                </span>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              </div>
              {recentSearches.map((recent) => (
                <button
                  key={recent.term}
                  type="button"
                  onClick={() => handleRecentClick(recent.term)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{recent.term}</span>
                </button>
              ))}
            </div>
          )}

          {/* Carregando */}
          {showResults && isLoading && (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          )}

          {/* Sem resultados */}
          {noResults && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado para &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Resultados agrupados */}
          {showResults && !isLoading && hasResults && (
            <div className="max-h-[360px] overflow-y-auto p-1">
              {Object.entries(data!.results).map(([category, items]) => {
                const groupStartIndex = runningIndex
                const group = (
                  <div key={category}>
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-muted-foreground">
                        {CATEGORY_ICONS[category] ?? null}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {category}
                      </span>
                    </div>
                    {items.map((item, i) => {
                      const itemIndex = groupStartIndex + i
                      const isActive = itemIndex === activeIndex
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => navigateTo(item.href, query)}
                          className={`flex w-full flex-col gap-0.5 rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50"
                          }`}
                        >
                          <span className="font-medium truncate">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
                runningIndex += items.length
                return group
              })}
            </div>
          )}

          {/* Dica de atalho */}
          {showResults && !isLoading && hasResults && (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">
                ↑↓
              </kbd>{" "}
              navegar{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">
                Enter
              </kbd>{" "}
              selecionar{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">
                Esc
              </kbd>{" "}
              fechar
            </div>
          )}
        </div>
      )}
    </div>
  )
}

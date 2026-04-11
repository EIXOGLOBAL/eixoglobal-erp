"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  searchCommands,
  groupCommandsByCategory,
  COMMAND_CATEGORY_LABELS,
  type CommandCategory,
  type CommandItem as CommandItemType,
} from "@/lib/command-registry"
import { Clock } from "lucide-react"

// ---------------------------------------------------------------------------
// localStorage helpers for recent commands
// ---------------------------------------------------------------------------

const RECENT_KEY = "erp-command-palette-recent"
const MAX_RECENT = 5

function getRecentCommandIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function addRecentCommandId(id: string): void {
  if (typeof window === "undefined") return
  try {
    const current = getRecentCommandIds()
    const updated = [id, ...current.filter((cid) => cid !== id)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole?: string
}

// ---------------------------------------------------------------------------
// Category render order
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: CommandCategory[] = [
  "acoes_rapidas",
  "navegacao",
  "admin",
  "sistema",
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette({
  open,
  onOpenChange,
  userRole = "USER",
}: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [recentIds, setRecentIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent commands from localStorage on mount / when dialog opens
  useEffect(() => {
    if (open) {
      setRecentIds(getRecentCommandIds())
      setQuery("")
    }
  }, [open])

  // Filtered & grouped commands
  const filteredCommands = useMemo(
    () => searchCommands(query, userRole),
    [query, userRole]
  )

  const grouped = useMemo(
    () => groupCommandsByCategory(filteredCommands),
    [filteredCommands]
  )

  // Recent commands (only when there's no query)
  const recentCommands = useMemo(() => {
    if (query.trim()) return []
    const allFiltered = searchCommands("", userRole)
    return recentIds
      .map((id) => allFiltered.find((cmd) => cmd.id === id))
      .filter((cmd): cmd is CommandItemType => cmd !== undefined)
  }, [query, recentIds, userRole])

  // Execute a command
  const executeCommand = useCallback(
    (command: CommandItemType) => {
      addRecentCommandId(command.id)
      setRecentIds(getRecentCommandIds())
      onOpenChange(false)

      if (command.action.startsWith("navigate:")) {
        const path = command.action.replace("navigate:", "")
        router.push(path)
      } else if (command.action === "action:logout") {
        // Trigger logout via the server action form
        const logoutForm = document.querySelector<HTMLFormElement>(
          'form[action*="logout"]'
        )
        if (logoutForm) {
          logoutForm.requestSubmit()
        } else {
          // Fallback: navigate to login
          router.push("/login")
        }
      }
    },
    [onOpenChange, router]
  )

  // Check if there are any results at all
  const hasResults =
    recentCommands.length > 0 ||
    CATEGORY_ORDER.some((cat) => grouped[cat].length > 0)

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca Rápida"
      description="Pesquise por comandos, navegação ou ações rápidas"
    >
      <CommandInput
        ref={inputRef}
        placeholder="Digite um comando ou pesquise..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!hasResults && (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        )}

        {/* Recent commands — shown only when there's no query */}
        {recentCommands.length > 0 && (
          <>
            <CommandGroup heading="Recentes">
              {recentCommands.map((cmd) => (
                <CommandItem
                  key={`recent-${cmd.id}`}
                  value={`recent-${cmd.id}-${cmd.title}`}
                  onSelect={() => executeCommand(cmd)}
                  className="gap-3"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{cmd.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {cmd.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Grouped commands in defined order */}
        {CATEGORY_ORDER.map((category) => {
          const commands = grouped[category]
          if (commands.length === 0) return null

          return (
            <CommandGroup
              key={category}
              heading={COMMAND_CATEGORY_LABELS[category]}
            >
              {commands.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.id}-${cmd.title}-${cmd.keywords.join(" ")}`}
                  onSelect={() => executeCommand(cmd)}
                  className="gap-3"
                >
                  <cmd.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{cmd.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {cmd.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}

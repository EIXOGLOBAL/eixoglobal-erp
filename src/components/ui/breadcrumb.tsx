"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, ChevronRight } from "lucide-react"
import { generateBreadcrumbs } from "@/lib/breadcrumb-utils"

export function Breadcrumb() {
  const pathname = usePathname()
  const items = generateBreadcrumbs(pathname)

  // Se só tem o Home, não renderiza breadcrumb
  if (items.length <= 1) return null

  return (
    <nav aria-label="Navegação estrutural" className="flex items-center">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isFirst = index === 0
          const isLast = item.isCurrent

          // Mobile: mostra apenas os 2 últimos itens + home
          // Desktop: mostra tudo
          const showOnMobile = isFirst || index >= items.length - 2

          return (
            <li
              key={item.href}
              className={`flex items-center gap-1 ${showOnMobile ? "" : "hidden md:flex"}`}
            >
              {/* Separador chevron (não no primeiro) */}
              {!isFirst && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}

              {/* Reticências no mobile quando itens são omitidos */}
              {showOnMobile && !isFirst && index === items.length - 2 && items.length > 3 && (
                <span className="md:hidden mr-1 text-muted-foreground/50">...</span>
              )}

              {isLast ? (
                <span
                  className="font-medium text-foreground truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.isHome ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[150px]"
                >
                  {item.isHome ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

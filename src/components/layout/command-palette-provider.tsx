"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { CommandPalette } from "./command-palette"

interface CommandPaletteContextValue {
    open: boolean
    setOpen: (open: boolean) => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
    open: false,
    setOpen: () => undefined,
})

export function useCommandPalette() {
    return useContext(CommandPaletteContext)
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                setOpen((prev) => !prev)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    return (
        <CommandPaletteContext.Provider value={{ open, setOpen }}>
            {children}
            <CommandPalette open={open} onOpenChange={setOpen} />
        </CommandPaletteContext.Provider>
    )
}

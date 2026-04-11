import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import type { ModulePermissions } from "@/components/layout/sidebar"
import { CommandPaletteProvider } from "@/components/layout/command-palette-provider"
import { GlobalLoading } from "@/components/ui/global-loading"
import { AIAssistantWrapper } from "@/components/ai/AIAssistantWrapper"

import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MODULES } from "@/lib/module-permissions"

/** Fetch the user's module permission booleans from the database. */
async function getModulePermissions(userId: string | undefined): Promise<ModulePermissions> {
    if (!userId) return {}

    try {
        const selectFields = Object.fromEntries(
            MODULES.map(m => [m.permissionField, true])
        )
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: selectFields,
        })
        if (!user) return {}

        // Convert to a plain Record<string, boolean>
        const perms: ModulePermissions = {}
        for (const mod of MODULES) {
            perms[mod.permissionField] = !!(user as any)[mod.permissionField]
        }
        return perms
    } catch {
        // If the module fields don't exist yet in the DB (migration pending),
        // fall back to granting access to everything so the app doesn't break.
        return Object.fromEntries(MODULES.map(m => [m.permissionField, true]))
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()
    const userRole = session?.user?.role ?? 'USER'

    // ADMIN always has full access — skip the DB query
    const modulePermissions = userRole === 'ADMIN'
        ? Object.fromEntries(MODULES.map(m => [m.permissionField, true]))
        : await getModulePermissions(session?.user?.id)

    return (
        <CommandPaletteProvider userRole={userRole}>
            <GlobalLoading />
            <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
                <div className="hidden border-r bg-muted/40 md:block">
                    <div className="flex h-full max-h-screen flex-col gap-2">
                        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                            <Link href="/" className="flex items-center gap-2 font-semibold">
                                <span className="">Eixo Global</span>
                            </Link>
                        </div>
                        <div className="flex-1">
                            <Sidebar
                                userRole={userRole}
                                modulePermissions={modulePermissions}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col">
                    <Header user={session?.user || null} modulePermissions={modulePermissions} />
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>
            <AIAssistantWrapper />
        </CommandPaletteProvider>
    )
}

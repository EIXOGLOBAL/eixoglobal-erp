import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { CommandPaletteProvider } from "@/components/layout/command-palette-provider"
import { GlobalLoading } from "@/components/ui/global-loading"
import { AIAssistantWrapper } from "@/components/ai/AIAssistantWrapper"

import { getSession } from "@/lib/auth"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    return (
        <CommandPaletteProvider>
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
                            <Sidebar userRole={session?.user?.role ?? 'USER'} />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col">
                    <Header user={session?.user || null} />
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>
            <AIAssistantWrapper />
        </CommandPaletteProvider>
    )
}

import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAnnouncements } from "@/app/actions/announcement-actions"
import { AnnouncementsClient } from "@/components/comunicados/announcements-client"
import { Megaphone } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function ComunicadosPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const result = await getAnnouncements()
  const announcements = result.success ? result.data : []

  const user = session.user as { id?: string; role?: string; companyId?: string }
  const canCreate = ["ADMIN", "MANAGER"].includes(user.role ?? "")
  const currentUserId = user.id ?? ""

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mural de Comunicados</h1>
          <p className="text-muted-foreground">Avisos e comunicados internos da empresa</p>
        </div>
      </div>
      <AnnouncementsClient
        initialAnnouncements={announcements.map(a => ({
          ...a,
          expiresAt: a.expiresAt ? new Date(a.expiresAt) : null,
          createdAt: new Date(a.createdAt),
          author: { id: a.author.id, name: a.author.name },
        }))}
        canCreate={canCreate}
        currentUserId={currentUserId}
      />
    </div>
  )
}
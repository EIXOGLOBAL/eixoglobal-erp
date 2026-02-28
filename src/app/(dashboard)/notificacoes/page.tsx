import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getNotifications } from "@/app/actions/notification-actions"
import { NotificationsClient } from "@/components/notifications/notifications-client"
import { Bell } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function NotificacoesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const result = await getNotifications(200)
  const notifications = result.success ? result.data : []

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6" />
        <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
      </div>
      <NotificationsClient initialNotifications={notifications as any[]} />
    </div>
  )
}

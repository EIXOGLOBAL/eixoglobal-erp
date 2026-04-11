"use client"

import { useState, useTransition } from "react"
import { createAnnouncement, deleteAnnouncement } from "@/app/actions/announcement-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Pin, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/formatters"

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT"
interface Author { id: string; name: string | null }
interface AnnouncementItem {
  id: string; title: string; content: string; priority: Priority
  isPinned: boolean; expiresAt: Date | null; createdAt: Date; author: Author
}
const priorityConfig: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "URGENTE", className: "bg-red-100 text-red-700 border-red-200" },
  HIGH:   { label: "ALTA",    className: "bg-orange-100 text-orange-700 border-orange-200" },
  NORMAL: { label: "NORMAL",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  LOW:    { label: "BAIXA",   className: "bg-gray-100 text-gray-600 border-gray-200" },
}
const cardBorder: Record<Priority, string> = {
  URGENT: "border-l-4 border-l-red-500",
  HIGH:   "border-l-4 border-l-orange-400",
  NORMAL: "border-l-4 border-l-blue-400",
  LOW:    "border-l-4 border-l-gray-300",
}
function isExpiringSoon(date: Date | null): boolean {
  if (!date) return false
  const diff = new Date(date).getTime() - Date.now()
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000
}
interface AnnouncementsClientProps {
  initialAnnouncements: AnnouncementItem[]
  canCreate: boolean
  currentUserId: string
}
export function AnnouncementsClient({ initialAnnouncements, canCreate }: AnnouncementsClientProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements)
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ title: "", content: "", priority: "NORMAL" as Priority, isPinned: false, expiresAt: "" })

  function handleCreate() {
    startTransition(async () => {
      const result = await createAnnouncement({ title: form.title, content: form.content, priority: form.priority, isPinned: form.isPinned, expiresAt: form.expiresAt || null })
      if (result.success) {
        toast({ title: "Comunicado criado com sucesso!" })
        setOpen(false)
        setForm({ title: "", content: "", priority: "NORMAL", isPinned: false, expiresAt: "" })
        window.location.reload()
      } else {
        toast({ title: "Erro", description: result.error ?? "Erro ao criar comunicado", variant: "destructive" })
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAnnouncement(id)
      if (result.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        toast({ title: "Comunicado removido" })
      } else {
        toast({ title: "Erro", description: result.error ?? "Erro ao remover comunicado", variant: "destructive" })
      }
    })
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Comunicado</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Criar Comunicado</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ann-title">Título</Label>
                  <Input id="ann-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do comunicado" />
                </div>
                <div>
                  <Label htmlFor="ann-content">Conteúdo</Label>
                  <Textarea id="ann-content" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Texto do comunicado..." rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v: string) => setForm(f => ({ ...f, priority: v as Priority }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="URGENT">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ann-expires">Expira em</Label>
                    <Input id="ann-expires" type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ann-pinned" checked={form.isPinned} onCheckedChange={(checked: boolean) => setForm(f => ({ ...f, isPinned: checked }))} />
                  <Label htmlFor="ann-pinned">Fixar no topo</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={isPending || !form.title || !form.content}>{isPending ? "Salvando..." : "Publicar"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Nenhum comunicado no momento</p>
          <p className="text-sm mt-1">Os comunicados publicados aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const cfg = priorityConfig[ann.priority]
            const expiring = isExpiringSoon(ann.expiresAt)
            return (
              <Card key={ann.id} className={cardBorder[ann.priority]}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ann.isPinned && <Pin className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <h3 className="font-bold text-base">{ann.title}</h3>
                      <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                    </div>
                    {canCreate && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0" onClick={() => handleDelete(ann.id)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>Por {ann.author.name ?? "Usuário"} • {formatDate(ann.createdAt)}</span>
                    {expiring && (
                      <span className="flex items-center gap-1 text-orange-600 font-medium">
                        <AlertTriangle className="h-3 w-3" />Expira em breve
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
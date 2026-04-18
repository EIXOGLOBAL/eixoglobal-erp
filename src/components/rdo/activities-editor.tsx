'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { addActivity, updateActivity, deleteActivity } from "@/app/actions/daily-report-actions"
import { Plus, Trash2, Pencil, Check, X, ClipboardList } from "lucide-react"
import { toNumber } from "@/lib/formatters"
import type { Decimal } from "@prisma/client/runtime/client"

interface Activity {
    id: string
    description: string
    location: string | null
    percentDone: number
    reportId: string
}

interface ActivityFromDB {
    id: string
    description: string
    location: string | null
    percentDone: number | Decimal
    reportId: string
}

interface ActivitiesEditorProps {
    reportId: string
    activities: ActivityFromDB[]
    reportStatus: string
}

export function ActivitiesEditor({ reportId, activities: initialActivities, reportStatus }: ActivitiesEditorProps) {
    const { toast } = useToast()
    const [activities, setActivities] = useState<Activity[]>(
        initialActivities.map(a => ({ ...a, percentDone: toNumber(a.percentDone) }))
    )

    // Add form state
    const [addDesc, setAddDesc] = useState("")
    const [addLocation, setAddLocation] = useState("")
    const [addPercent, setAddPercent] = useState<number>(0)
    const [addingLoading, setAddingLoading] = useState(false)

    // Edit state
    const [editId, setEditId] = useState<string | null>(null)
    const [editDesc, setEditDesc] = useState("")
    const [editLocation, setEditLocation] = useState("")
    const [editPercent, setEditPercent] = useState<number>(0)

    const isEditable = reportStatus === 'DRAFT'

    async function handleAdd() {
        if (!addDesc.trim()) {
            toast({ variant: "destructive", title: "Informe a descrição da atividade" })
            return
        }

        setAddingLoading(true)
        try {
            const result = await addActivity(reportId, {
                description: addDesc.trim(),
                location: addLocation.trim() || null,
                percentDone: addPercent,
            })
            if (result.success && result.data) {
                setActivities(prev => [...prev, {
                    ...result.data,
                    percentDone: toNumber(result.data.percentDone)
                } as Activity])
                setAddDesc("")
                setAddLocation("")
                setAddPercent(0)
                toast({ title: "Atividade adicionada com sucesso." })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setAddingLoading(false)
        }
    }

    async function handleDelete(activityId: string) {
        if (!confirm("Remover esta atividade?")) return
        const result = await deleteActivity(activityId)
        if (result.success) {
            setActivities(prev => prev.filter(a => a.id !== activityId))
            toast({ title: "Atividade removida." })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    function startEdit(activity: Activity) {
        setEditId(activity.id)
        setEditDesc(activity.description)
        setEditLocation(activity.location || "")
        setEditPercent(activity.percentDone)
    }

    async function handleUpdate(activityId: string) {
        if (!editDesc.trim()) {
            toast({ variant: "destructive", title: "Informe a descrição" })
            return
        }
        const result = await updateActivity(activityId, {
            description: editDesc.trim(),
            location: editLocation.trim() || null,
            percentDone: editPercent,
        })
        if (result.success && result.data) {
            setActivities(prev => prev.map(a => a.id === activityId
                ? { ...a, description: editDesc.trim(), location: editLocation.trim() || null, percentDone: editPercent }
                : a
            ))
            setEditId(null)
            toast({ title: "Atividade atualizada." })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Atividades Executadas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-36">Local</TableHead>
                            <TableHead className="w-36 text-center">% Concluído</TableHead>
                            {isEditable && <TableHead className="w-24 text-right">Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activities.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isEditable ? 4 : 3} className="text-center text-muted-foreground py-6">
                                    Nenhuma atividade registrada.
                                </TableCell>
                            </TableRow>
                        )}
                        {activities.map(a => (
                            <TableRow key={a.id}>
                                <TableCell>
                                    {editId === a.id ? (
                                        <Input
                                            value={editDesc}
                                            onChange={e => setEditDesc(e.target.value)}
                                            className="h-8"
                                        />
                                    ) : (
                                        <span className="font-medium">{a.description}</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editId === a.id ? (
                                        <Input
                                            value={editLocation}
                                            onChange={e => setEditLocation(e.target.value)}
                                            className="h-8"
                                            placeholder="Local"
                                        />
                                    ) : (
                                        <span className="text-muted-foreground">{a.location || "—"}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {editId === a.id ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="range"
                                                min={0}
                                                max={100}
                                                step={5}
                                                value={editPercent}
                                                onChange={e => setEditPercent(Number(e.target.value))}
                                                className="h-6 w-24"
                                            />
                                            <span className="text-xs w-10">{editPercent}%</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${a.percentDone}%` }}
                                                />
                                            </div>
                                            <span className="text-xs">{a.percentDone}%</span>
                                        </div>
                                    )}
                                </TableCell>
                                {isEditable && (
                                    <TableCell className="text-right">
                                        {editId === a.id ? (
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleUpdate(a.id)} aria-label="Confirmar" title="Salvar">
                                                    <Check className="h-4 w-4 text-green-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setEditId(null)} aria-label="Fechar" title="Cancelar">
                                                    <X className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => startEdit(a)} aria-label="Editar" title="Editar">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} aria-label="Excluir" title="Remover">
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {isEditable && (
                    <div className="space-y-3 pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Adicionar Atividade</p>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            <Input
                                placeholder="Descrição da atividade *"
                                value={addDesc}
                                onChange={e => setAddDesc(e.target.value)}
                                className="md:col-span-1"
                            />
                            <Input
                                placeholder="Local (ex: Bloco A)"
                                value={addLocation}
                                onChange={e => setAddLocation(e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={addPercent}
                                    onChange={e => setAddPercent(Number(e.target.value))}
                                    className="h-8"
                                />
                                <span className="text-sm font-medium w-12">{addPercent}%</span>
                            </div>
                        </div>
                        <Button onClick={handleAdd} disabled={addingLoading} type="button" className="w-full md:w-auto">
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Atividade
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

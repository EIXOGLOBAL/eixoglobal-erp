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
import { addWorker, updateWorker, deleteWorker } from "@/app/actions/daily-report-actions"
import { Plus, Trash2, Pencil, Check, X, Users } from "lucide-react"

const COMMON_ROLES = [
    "Pedreiro",
    "Servente",
    "Mestre de Obras",
    "Eletricista",
    "Encanador",
    "Carpinteiro",
    "Armador",
    "Pintor",
    "Ajudante",
]

interface Worker {
    id: string
    role: string
    count: number
    reportId: string
}

interface WorkforceEditorProps {
    reportId: string
    workers: Worker[]
    reportStatus: string
}

export function WorkforceEditor({ reportId, workers: initialWorkers, reportStatus }: WorkforceEditorProps) {
    const { toast } = useToast()
    const [workers, setWorkers] = useState<Worker[]>(initialWorkers)

    // Add new worker form state
    const [addRole, setAddRole] = useState("")
    const [addCount, setAddCount] = useState<number | "">(1)
    const [addingLoading, setAddingLoading] = useState(false)

    // Edit state
    const [editId, setEditId] = useState<string | null>(null)
    const [editRole, setEditRole] = useState("")
    const [editCount, setEditCount] = useState<number | "">(1)

    const isEditable = reportStatus === 'DRAFT'
    const totalWorkers = workers.reduce((sum, w) => sum + w.count, 0)

    async function handleAdd() {
        if (!addRole.trim()) {
            toast({ variant: "destructive", title: "Informe a função" })
            return
        }
        if (!addCount || addCount < 1) {
            toast({ variant: "destructive", title: "Quantidade inválida" })
            return
        }

        setAddingLoading(true)
        try {
            const result = await addWorker(reportId, addRole.trim(), Number(addCount))
            if (result.success && result.data) {
                setWorkers(prev => [...prev, result.data as Worker])
                setAddRole("")
                setAddCount(1)
                toast({ title: "Efetivo adicionado com sucesso." })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setAddingLoading(false)
        }
    }

    async function handleDelete(workerId: string) {
        if (!confirm("Remover este efetivo?")) return
        const result = await deleteWorker(workerId)
        if (result.success) {
            setWorkers(prev => prev.filter(w => w.id !== workerId))
            toast({ title: "Efetivo removido." })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    function startEdit(worker: Worker) {
        setEditId(worker.id)
        setEditRole(worker.role)
        setEditCount(worker.count)
    }

    async function handleUpdate(workerId: string) {
        if (!editRole.trim()) {
            toast({ variant: "destructive", title: "Informe a função" })
            return
        }
        const result = await updateWorker(workerId, editRole.trim(), Number(editCount))
        if (result.success && result.data) {
            setWorkers(prev => prev.map(w => w.id === workerId
                ? { ...w, role: editRole.trim(), count: Number(editCount) }
                : w
            ))
            setEditId(null)
            toast({ title: "Efetivo atualizado." })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Efetivo em Obra
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Função</TableHead>
                            <TableHead className="w-32 text-center">Quantidade</TableHead>
                            {isEditable && <TableHead className="w-24 text-right">Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isEditable ? 3 : 2} className="text-center text-muted-foreground py-6">
                                    Nenhum efetivo registrado.
                                </TableCell>
                            </TableRow>
                        )}
                        {workers.map(w => (
                            <TableRow key={w.id}>
                                <TableCell>
                                    {editId === w.id ? (
                                        <Input
                                            value={editRole}
                                            onChange={e => setEditRole(e.target.value)}
                                            className="h-8"
                                        />
                                    ) : (
                                        <span className="font-medium">{w.role}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {editId === w.id ? (
                                        <Input
                                            type="number"
                                            min={1}
                                            value={editCount}
                                            onChange={e => setEditCount(Number(e.target.value))}
                                            className="h-8 w-20 text-center mx-auto"
                                        />
                                    ) : (
                                        w.count
                                    )}
                                </TableCell>
                                {isEditable && (
                                    <TableCell className="text-right">
                                        {editId === w.id ? (
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleUpdate(w.id)} title="Salvar">
                                                    <Check className="h-4 w-4 text-green-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setEditId(null)} title="Cancelar">
                                                    <X className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => startEdit(w)} title="Editar">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)} title="Remover">
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {/* Total row */}
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-center">{totalWorkers}</TableCell>
                            {isEditable && <TableCell />}
                        </TableRow>
                    </TableBody>
                </Table>

                {isEditable && (
                    <div className="space-y-3 pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Adicionar Função</p>
                        <div className="flex gap-2 flex-wrap">
                            {COMMON_ROLES.map(role => (
                                <Button
                                    key={role}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setAddRole(role)}
                                    type="button"
                                >
                                    {role}
                                </Button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Função (ex: Pedreiro)"
                                value={addRole}
                                onChange={e => setAddRole(e.target.value)}
                                className="flex-1"
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                            <Input
                                type="number"
                                min={1}
                                placeholder="Qtd"
                                value={addCount}
                                onChange={e => setAddCount(Number(e.target.value))}
                                className="w-24"
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                            <Button onClick={handleAdd} disabled={addingLoading} type="button">
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { deleteSalaryTable, deleteSalaryGrade } from "@/app/actions/salary-table-actions"
import { Trash2, Loader2 } from "lucide-react"

interface DeleteSalaryTableButtonProps {
    id: string
    name: string
}

export function DeleteSalaryTableButton({ id, name }: DeleteSalaryTableButtonProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    async function handleDelete() {
        if (!confirm(`Deseja excluir a tabela "${name}"? Esta ação removerá todos os grades vinculados.`)) return
        setLoading(true)
        try {
            const result = await deleteSalaryTable(id)
            if (result.success) {
                toast({ title: "Tabela excluída", description: `"${name}" foi excluída com sucesso.` })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro inesperado", description: "Tente novamente." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

interface DeleteSalaryGradeButtonProps {
    id: string
    label: string
}

export function DeleteSalaryGradeButton({ id, label }: DeleteSalaryGradeButtonProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    async function handleDelete() {
        if (!confirm(`Deseja excluir o grade "${label}"?`)) return
        setLoading(true)
        try {
            const result = await deleteSalaryGrade(id)
            if (result.success) {
                toast({ title: "Grade excluído", description: `"${label}" foi excluído com sucesso.` })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro inesperado", description: "Tente novamente." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

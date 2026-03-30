'use client'

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, X, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateBulletinItem } from "@/app/actions/bulletin-actions"
import { useRouter } from "next/navigation"

interface BulletinItemInlineEditorProps {
    itemId: string
    initialValue: number
    maxValue: number
    onEditComplete?: () => void
}

export function BulletinItemInlineEditor({
    itemId,
    initialValue,
    maxValue,
    onEditComplete,
}: BulletinItemInlineEditorProps) {
    const [value, setValue] = useState(initialValue.toString())
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const { toast } = useToast()
    const router = useRouter()

    const numValue = parseFloat(value)
    const isOverflow = numValue > maxValue
    const isValid = !isNaN(numValue) && numValue >= 0

    async function handleSave() {
        if (!isValid) {
            setError('Valor inválido')
            return
        }

        setIsSaving(true)
        try {
            const result = await updateBulletinItem(itemId, numValue)
            if (result.success) {
                toast({ title: 'Valor atualizado com sucesso' })
                setIsEditing(false)
                router.refresh()
                onEditComplete?.()
            } else {
                setError(result.error || 'Erro ao salvar')
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } catch (err: any) {
            setError(err.message)
            toast({ variant: 'destructive', title: 'Erro', description: err.message })
        } finally {
            setIsSaving(false)
        }
    }

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
                {initialValue.toFixed(2)}
            </button>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <Input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => {
                    setValue(e.target.value)
                    setError('')
                }}
                className={`w-24 h-8 ${isOverflow ? 'border-orange-500 bg-orange-50' : ''}`}
                autoFocus
            />
            {isOverflow && (
                <div className="flex items-center gap-1 text-orange-600 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <span>Acima do limite</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <span>{error}</span>
                </div>
            )}
            <div className="flex gap-1">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={handleSave}
                    disabled={!isValid || isSaving}
                >
                    <Check className="h-3 w-3" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-600"
                    onClick={() => {
                        setValue(initialValue.toString())
                        setIsEditing(false)
                        setError('')
                    }}
                    disabled={isSaving}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    )
}

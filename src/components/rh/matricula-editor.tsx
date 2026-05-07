'use client'
import { useRouter } from 'next/navigation'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { updateMatricula } from '@/app/actions/employee-actions'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MatriculaEditorProps {
  employeeId: string
  matricula: string | null
}

export function MatriculaEditor({
  employeeId, matricula }: MatriculaEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(matricula ?? '')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  function startEditing() {
    setEditing(true)
    setValue(matricula ?? '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function cancelEditing() {
    setEditing(false)
    setValue(matricula ?? '')
  }

  async function save() {
    if (value === (matricula ?? '')) {
      setEditing(false)
      return
    }
    setLoading(true)
    try {
      const result = await updateMatricula(employeeId, value)
      if (result.success) {
        toast({ title: 'Matrícula atualizada', description: `Matrícula definida como: ${value}` })
        setEditing(false)
        router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancelEditing()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">#</span>
        <Input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-24 font-mono text-sm px-2"
          maxLength={10}
          disabled={loading}
        />
        <Button
 size="icon" aria-label="Confirmar matrícula" 
 variant="ghost"
 className="h-6 w-6"
 onClick={save}
 disabled={loading}
>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
 size="icon" aria-label="Cancelar edição" 
 variant="ghost"
 className="h-6 w-6"
 onClick={cancelEditing}
 disabled={loading}
>
          <X className="h-3 w-3 text-red-500" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="font-mono text-lg font-semibold text-muted-foreground">
        {matricula ? `[${matricula}]` : '[----]'}
      </span>
      <Button
 size="icon" aria-label="Editar matrícula" 
 variant="ghost"
 className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
 onClick={startEditing}
>
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { updateUserAIAccess } from '@/app/actions/ai-config-actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const AI_LEVELS = [
  { value: 'AUTO', label: 'Auto (por Role)' },
  { value: 'FULL', label: 'Completo' },
  { value: 'STANDARD', label: 'Padr\u00e3o' },
  { value: 'BASIC', label: 'B\u00e1sico' },
  { value: 'NONE', label: 'Desativado' },
] as const

interface AIAccessSelectProps {
  userId: string
  currentLevel: string | null
  userName: string
}

export function AIAccessSelect({ userId, currentLevel, userName }: AIAccessSelectProps) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(currentLevel ?? 'AUTO')
  const { toast } = useToast()

  function handleChange(newValue: string) {
    const previous = value
    setValue(newValue)

    startTransition(async () => {
      const result = await updateUserAIAccess(userId, newValue)
      if (!result.success) {
        setValue(previous)
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao atualizar n\u00edvel de IA',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Sucesso',
          description: `N\u00edvel de IA de ${userName} atualizado com sucesso`,
        })
      }
    })
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Selecionar n\u00edvel" />
      </SelectTrigger>
      <SelectContent>
        {AI_LEVELS.map((level) => (
          <SelectItem key={level.value} value={level.value}>
            {level.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

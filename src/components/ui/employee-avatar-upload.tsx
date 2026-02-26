'use client'

import { useState, useRef } from 'react'
import { uploadEmployeeAvatar, removeEmployeeAvatar } from '@/app/actions/avatar-actions'
import { useToast } from '@/hooks/use-toast'
import { Button } from './button'
import { Camera, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmployeeAvatarUploadProps {
  employeeId: string
  currentAvatarUrl?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  editable?: boolean
  className?: string
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function EmployeeAvatarUpload({
  employeeId,
  currentAvatarUrl,
  name,
  size = 'md',
  editable = false,
  className,
}: EmployeeAvatarUploadProps) {
  const { toast } = useToast()
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-2xl',
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadEmployeeAvatar(employeeId, formData)
    setUploading(false)

    if (result.success && result.avatarUrl) {
      setAvatarUrl(result.avatarUrl + '?t=' + Date.now())
      toast({ title: 'Foto atualizada com sucesso!' })
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.error })
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleRemove() {
    const result = await removeEmployeeAvatar(employeeId)
    if (result.success) {
      setAvatarUrl(null)
      toast({ title: 'Foto removida' })
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.error })
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'relative rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold border-2 border-border',
          sizeClasses[size]
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name ?? 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-muted-foreground">{getInitials(name)}</span>
        )}
        {editable && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {editable && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="h-3 w-3 mr-1" />
            {uploading ? 'Enviando...' : 'Alterar foto'}
          </Button>
          {avatarUrl && (
            <Button variant="ghost" size="sm" onClick={handleRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

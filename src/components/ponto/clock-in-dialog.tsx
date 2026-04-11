'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { clockIn } from '@/app/actions/timesheet-actions'
import { Clock, Loader2, MapPin } from 'lucide-react'

interface Project {
  id: string
  name: string
}

interface ClockInDialogProps {
  projects?: Project[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClockInDialog({
  projects = [],
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ClockInDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [projectId, setProjectId] = useState<string>('')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const { toast } = useToast()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  function captureLocation() {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Geolocalização não disponível neste navegador.',
      })
      return
    }

    setLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLoadingLocation(false)
        toast({
          title: 'Localização capturada',
          description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`,
        })
      },
      () => {
        setLoadingLocation(false)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível obter a localização.',
        })
      },
    )
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await clockIn({
        projectId: projectId || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      })

      if (result.success) {
        toast({
          title: 'Ponto Registrado',
          description: 'Entrada registrada com sucesso.',
        })
        setOpen(false)
        setProjectId('')
        setLocation(null)
        window.location.reload()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao registrar ponto',
          description: result.error,
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Clock className="mr-2 h-4 w-4" />
              Registrar Entrada
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Entrada</DialogTitle>
          <DialogDescription>
            Registre sua entrada de ponto. Selecione o projeto e capture sua localização.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Projeto (opcional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Localização</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={captureLocation}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                {location ? 'Atualizar Localização' : 'Capturar Localização'}
              </Button>
              {location && (
                <span className="text-xs text-muted-foreground">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  PenLine,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  Loader2,
  FileSignature,
} from 'lucide-react'
import {
  initiateContractSignature,
  initiateBulletinSignature,
  checkSignatureStatus,
  cancelSignature,
  downloadSignedPdf,
} from '@/app/actions/signature-actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignerInfo {
  email: string
  name: string
  status: string
  signedAt: string | null
}

interface SignaturePanelProps {
  entityType: 'contract' | 'bulletin'
  entityId: string
  currentStatus?: string | null
  signers?: SignerInfo[]
  userRole: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignaturePanel({
  entityType,
  entityId,
  currentStatus,
  userRole,
}: SignaturePanelProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState<string | null>(currentStatus ?? null)
  const [signerList, setSignerList] = useState<SignerInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [canceling, setCanceling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const canManage = userRole === 'ADMIN' || userRole === 'MANAGER'
  const canCancel = userRole === 'ADMIN'

  // ---------------------------------------------------------------------------
  // Polling for status updates when PROCESSING
  // ---------------------------------------------------------------------------

  const doCheckStatus = useCallback(async () => {
    if (checking) return
    setChecking(true)
    try {
      const result = await checkSignatureStatus(entityType, entityId)
      if (result.success && result.data) {
        setStatus(result.data.status)
        setSignerList(result.data.signers)

        if (result.data.status === 'SIGNED') {
          toast({
            title: 'Documento Assinado',
            description: 'Todas as assinaturas foram coletadas com sucesso.',
          })
        }
      }
    } catch {
      // Silently handle polling errors
    } finally {
      setChecking(false)
    }
  }, [entityType, entityId, checking, toast])

  useEffect(() => {
    // Initial fetch of signer status if PROCESSING
    if (status === 'PROCESSING') {
      doCheckStatus()
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-poll every 60s when PROCESSING
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    if (status === 'PROCESSING') {
      pollIntervalRef.current = setInterval(() => {
        doCheckStatus()
      }, 60_000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [status, doCheckStatus])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleInitiate = async () => {
    setLoading(true)
    try {
      const result =
        entityType === 'contract'
          ? await initiateContractSignature(entityId)
          : await initiateBulletinSignature(entityId)

      if (result.success) {
        setStatus('PROCESSING')
        toast({
          title: 'Assinatura enviada',
          description: `Documento enviado para ${result.data?.signersCount ?? 0} signatario(s).`,
        })
        // Fetch signer details
        await doCheckStatus()
      } else {
        toast({
          title: 'Erro',
          description: result.error ?? 'Erro ao enviar para assinatura.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao enviar para assinatura.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o motivo do cancelamento.',
        variant: 'destructive',
      })
      return
    }

    setCanceling(true)
    try {
      const result = await cancelSignature(entityType, entityId, cancelReason)
      if (result.success) {
        setStatus('CANCELED')
        setCancelDialogOpen(false)
        setCancelReason('')
        setSignerList([])
        toast({
          title: 'Assinatura cancelada',
          description: 'A assinatura digital foi cancelada com sucesso.',
        })
      } else {
        toast({
          title: 'Erro',
          description: result.error ?? 'Erro ao cancelar assinatura.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao cancelar assinatura.',
        variant: 'destructive',
      })
    } finally {
      setCanceling(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const result = await downloadSignedPdf(entityType, entityId)
      if (result.success && result.data?.url) {
        // Trigger download
        const link = document.createElement('a')
        link.href = result.data.url
        link.download = `${entityType === 'contract' ? 'contrato' : 'boletim'}-assinado.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({
          title: 'Download iniciado',
          description: 'O PDF assinado esta sendo baixado.',
        })
      } else {
        toast({
          title: 'Erro',
          description: result.error ?? 'Erro ao baixar documento.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao baixar documento.',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const signedCount = signerList.filter((s) => s.status === 'signed').length
  const totalSigners = signerList.length

  // ---------------------------------------------------------------------------
  // STATE: No signature
  // ---------------------------------------------------------------------------
  if (!status || status === 'DRAFT') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-5 w-5" />
            Assinatura Digital
          </CardTitle>
          <CardDescription>
            Envie este documento para assinatura digital via D4Sign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <Button onClick={handleInitiate} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Enviando...' : 'Solicitar Assinatura Digital'}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma assinatura digital solicitada.
              <br />
              Apenas administradores e gestores podem solicitar.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // STATE: PROCESSING
  // ---------------------------------------------------------------------------
  if (status === 'PROCESSING') {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSignature className="h-5 w-5" />
                  Assinatura Digital
                </CardTitle>
                <CardDescription className="mt-1">
                  Aguardando coleta de assinaturas
                </CardDescription>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                <Clock className="h-3 w-3 mr-1" />
                Aguardando Assinaturas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signers List */}
            {signerList.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Progresso: {signedCount} de {totalSigners} assinatura(s)
                </p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{
                      width: `${totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="space-y-2 mt-3">
                  {signerList.map((signer, idx) => (
                    <div
                      key={`${signer.email}-${idx}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        {signer.status === 'signed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{signer.name}</p>
                          <p className="text-xs text-muted-foreground">{signer.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant={signer.status === 'signed' ? 'secondary' : 'outline'}
                        className={
                          signer.status === 'signed'
                            ? 'bg-green-100 text-green-800'
                            : ''
                        }
                      >
                        {signer.status === 'signed' ? 'Assinado' : 'Aguardando'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => doCheckStatus()}
                disabled={checking}
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verificar Status
              </Button>

              {canCancel && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Assinatura
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Assinatura Digital</DialogTitle>
              <DialogDescription>
                Esta acao ira cancelar o processo de assinatura digital. Os
                signatarios nao poderao mais assinar o documento. Esta acao nao
                pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="cancelReason" className="text-sm font-medium">
                Motivo do cancelamento
              </label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={canceling}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={canceling || !cancelReason.trim()}
              >
                {canceling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {canceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // STATE: SIGNED
  // ---------------------------------------------------------------------------
  if (status === 'SIGNED') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="h-5 w-5" />
                Assinatura Digital
              </CardTitle>
              <CardDescription className="mt-1">
                Documento assinado digitalmente
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Documento Assinado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Signer details */}
          {signerList.length > 0 && (
            <div className="space-y-2">
              {signerList.map((signer, idx) => (
                <div
                  key={`${signer.email}-${idx}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border bg-green-50/50"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{signer.name}</p>
                      <p className="text-xs text-muted-foreground">{signer.email}</p>
                    </div>
                  </div>
                  {signer.signedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(signer.signedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full"
            variant="outline"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {downloading ? 'Baixando...' : 'Baixar PDF Assinado'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // STATE: CANCELED
  // ---------------------------------------------------------------------------
  if (status === 'CANCELED') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="h-5 w-5" />
                Assinatura Digital
              </CardTitle>
              <CardDescription className="mt-1">
                O processo de assinatura foi cancelado
              </CardDescription>
            </div>
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Assinatura Cancelada
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <Button onClick={handleInitiate} disabled={loading} variant="outline" className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Enviando...' : 'Reenviar para Assinatura'}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              A assinatura digital deste documento foi cancelada.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Fallback
  return null
}

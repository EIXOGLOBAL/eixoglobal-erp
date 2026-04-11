'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { runFraudAnalysis } from '@/app/actions/monitoring-actions'
import { Search, ShieldCheck, RefreshCw } from 'lucide-react'

export function MonitoringActions() {
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFraudAnalysis = async () => {
    setLoading('fraud')
    try {
      const result = await runFraudAnalysis()
      if (result.success) {
        toast({
          title: 'Analise concluida',
          description: `${result.data?.summary.total || 0} alertas detectados (${result.data?.summary.critical || 0} criticos)`,
        })
        window.location.reload()
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handleFraudAnalysis}
        disabled={!!loading}
        variant="outline"
        size="sm"
      >
        {loading === 'fraud' ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-2 h-4 w-4" />
        )}
        Executar Analise de Fraude
      </Button>
    </div>
  )
}

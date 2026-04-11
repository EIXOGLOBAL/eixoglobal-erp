'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react'

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  CLEAN: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: ShieldCheck, label: 'Limpo' },
  WARNING: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Shield, label: 'Atencao' },
  CRITICAL: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: ShieldAlert, label: 'Critico' },
}

export function SecurityScanList({ scans }: { scans: any[] }) {
  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhuma varredura realizada</p>
          <p className="text-sm text-muted-foreground">
            As varreduras de seguranca sao executadas automaticamente 2x ao dia
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {scans.map((scan: any) => {
        const config = statusConfig[scan.status] || statusConfig.WARNING
        const Icon = config.icon
        const vulns = scan.vulnerabilities as any

        return (
          <Card key={scan.id}>
            <CardContent className="flex items-start gap-4 p-4">
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={config.color}>
                    {config.label}
                  </Badge>
                  <Badge variant="secondary">{scan.scanType}</Badge>
                </div>

                {vulns && (
                  <div className="text-sm space-y-1">
                    {vulns.npm?.length > 0 && (
                      <p>{vulns.npm.length} vulnerabilidade(s) npm</p>
                    )}
                    {vulns.missingHeaders?.length > 0 && (
                      <p>{vulns.missingHeaders.length} header(s) de seguranca ausente(s)</p>
                    )}
                    {vulns.outdatedDeps?.length > 0 && (
                      <p>{vulns.outdatedDeps.length} dependencia(s) para verificar</p>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(scan.scanDate).toLocaleString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

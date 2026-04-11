'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { markAsPaid } from '@/app/actions/financial-actions'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from "@/lib/formatters"

interface OverdueRecord {
  id: string
  description: string
  amount: number
  dueDate: Date
  status: string
  category: string | null
  agingBucket: string
  daysOverdue: number
}

interface InadimplenciaClientProps {
  records: OverdueRecord[]
}

const buckets = ['1-30 dias', '31-60 dias', '61-90 dias', '+90 dias']

const bucketColor: Record<string, string> = {
  '1-30 dias': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '31-60 dias': 'bg-orange-100 text-orange-800 border-orange-200',
  '61-90 dias': 'bg-red-100 text-red-800 border-red-200',
  '+90 dias': 'bg-red-200 text-red-900 border-red-300',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function InadimplenciaClient({ records }: InadimplenciaClientProps) {
  const { toast } = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeBucket, setActiveBucket] = useState<string>('todos')

  const filtered = activeBucket === 'todos'
    ? records
    : records.filter(r => r.agingBucket === activeBucket)

  const totalFiltered = filtered.reduce((acc, r) => acc + r.amount, 0)

  async function handleMarkAsReceived(id: string, description: string) {
    setLoadingId(id)
    try {
      const result = await markAsPaid(id)
      if (result.success) {
        toast({ title: 'Marcado como Recebido!', description })
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Bucket Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeBucket === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveBucket('todos')}
        >
          Todos ({records.length})
        </Button>
        {buckets.map(bucket => {
          const count = records.filter(r => r.agingBucket === bucket).length
          return (
            <Button
              key={bucket}
              variant={activeBucket === bucket ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveBucket(bucket)}
              disabled={count === 0}
            >
              {bucket} ({count})
            </Button>
          )
        })}
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} — Total:{' '}
            <span className="font-bold text-red-600">{fmt(totalFiltered)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro vencido nessa faixa.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Descrição</th>
                    <th className="text-left py-2 pr-4 font-medium">Categoria</th>
                    <th className="text-left py-2 pr-4 font-medium">Vencimento</th>
                    <th className="text-right py-2 pr-4 font-medium">Dias em Atraso</th>
                    <th className="text-right py-2 pr-4 font-medium">Valor</th>
                    <th className="text-center py-2 pr-4 font-medium">Faixa</th>
                    <th className="text-center py-2 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(record => (
                    <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{record.description}</span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {record.category ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-red-600">
                        {formatDate(record.dueDate)}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium text-red-700">
                        {record.daysOverdue}d
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold">
                        {fmt(record.amount)}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <Badge className={bucketColor[record.agingBucket] + ' text-xs border'}>
                          {record.agingBucket}
                        </Badge>
                      </td>
                      <td className="py-2 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-50"
                          onClick={() => handleMarkAsReceived(record.id, record.description)}
                          disabled={loadingId === record.id}
                        >
                          {loadingId === record.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          <span className="ml-1 hidden sm:inline">Recebido</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={4} className="py-2 pr-4 text-right text-sm">Total:</td>
                    <td className="py-2 pr-4 text-right text-red-600">{fmt(totalFiltered)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

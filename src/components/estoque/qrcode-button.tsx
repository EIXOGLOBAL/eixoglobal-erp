'use client'

import Link from 'next/link'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QRCodeButton({ materialId }: { materialId: string }) {
  return (
    <Link href={`/estoque/materiais/${materialId}/qrcode`} target="_blank">
      <Button variant="outline" size="sm">
        <QrCode className="h-4 w-4 mr-2" />
        QR Code
      </Button>
    </Link>
  )
}

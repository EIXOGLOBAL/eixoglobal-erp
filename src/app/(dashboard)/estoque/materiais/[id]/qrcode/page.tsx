import { prisma } from '@/lib/prisma'
import { generateQRCodeDataURL } from '@/lib/qrcode'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PrintButton } from '@/components/estoque/print-button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MaterialQRCodePage({ params }: PageProps) {
  const { id } = await params

  const material = await prisma.material.findUnique({
    where: { id },
  })

  if (!material) {
    notFound()
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const materialUrl = `${appUrl}/estoque/materiais/${id}`
  const qrDataUrl = await generateQRCodeDataURL(materialUrl)

  const currentStock = Number(material.currentStock)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: 80mm 80mm; margin: 5mm; }
          body { font-family: monospace; }
        }
      `}</style>

      <div className="no-print flex items-center gap-3 p-4 border-b">
        <Link href="/estoque">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <PrintButton />
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div
          className="border border-gray-300 rounded-lg p-6 flex flex-col items-center gap-3 bg-white shadow-xs"
          style={{ width: '240px', fontFamily: 'monospace' }}
        >
          <img
            src={qrDataUrl}
            alt={`QR Code para ${material.name}`}
            width={150}
            height={150}
            className="rounded"
          />

          <div className="w-full text-center space-y-1">
            <p className="font-bold text-sm leading-tight wrap-break-word">{material.name}</p>

            {material.code && (
              <p className="text-xs text-gray-600">
                Código: <span className="font-mono">{material.code}</span>
              </p>
            )}

            <p className="text-xs text-gray-600">
              Un: {material.unit} | Estoque: {currentStock}
            </p>

            <p className="text-xs text-gray-400 mt-2">ERP Eixo Global</p>
          </div>
        </div>
      </div>
    </>
  )
}

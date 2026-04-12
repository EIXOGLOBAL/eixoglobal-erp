/**
 * Exemplos de uso da integração com Cloudflare R2
 * 
 * Este arquivo contém exemplos práticos de como usar o sistema de storage
 * em diferentes cenários do EixoGlobal ERP.
 */

// ---------------------------------------------------------------------------
// 1. UPLOAD DE NOTAS FISCAIS (XML/PDF)
// ---------------------------------------------------------------------------

/**
 * Exemplo: Componente para upload de nota fiscal
 */
'use client'

import { FileUploader } from '@/components/upload/file-uploader'
import { useState } from 'react'

export function InvoiceUploadExample() {
  const [uploadedInvoice, setUploadedInvoice] = useState<string | null>(null)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Upload de Nota Fiscal</h2>
      
      <FileUploader
        category="invoice"
        accept=".xml,.pdf,application/xml,text/xml,application/pdf"
        maxSize={5 * 1024 * 1024} // 5 MB
        buttonText="Selecionar Nota Fiscal"
        description="Arraste o arquivo XML ou PDF da nota fiscal aqui"
        useDirectUpload={true} // Upload direto para R2
        onUploadComplete={(result) => {
          console.log('Nota fiscal enviada:', result)
          setUploadedInvoice(result.key)
          
          // Aqui você pode salvar a referência no banco de dados
          // await saveInvoiceToDatabase({
          //   fileKey: result.key,
          //   fileName: result.fileName,
          //   size: result.size,
          // })
        }}
        onError={(error) => {
          console.error('Erro ao enviar nota fiscal:', error)
          alert(`Erro: ${error}`)
        }}
      />

      {uploadedInvoice && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">
            Nota fiscal enviada com sucesso! Chave: {uploadedInvoice}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Exemplo: Upload de nota fiscal via API (server-side)
 */
import { uploadInvoice } from '@/lib/storage/upload'

export async function uploadInvoiceServerSide(file: File) {
  try {
    const result = await uploadInvoice(file)
    
    console.log('Upload concluído:', result)
    // result = {
    //   key: 'invoices/abc123_nota-fiscal.xml',
    //   url: 'invoices/abc123_nota-fiscal.xml',
    //   fileName: 'abc123_nota-fiscal.xml',
    //   size: 12345,
    //   contentType: 'application/xml'
    // }

    // Salvar no banco de dados
    // await db.invoice.create({
    //   data: {
    //     fileKey: result.key,
    //     fileName: result.fileName,
    //     fileSize: result.size,
    //     uploadedAt: new Date(),
    //   }
    // })

    return result
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// 2. UPLOAD DE FOTOS DE PRODUTOS
// ---------------------------------------------------------------------------

/**
 * Exemplo: Componente para upload de foto de produto
 */
import { ImageUploader } from '@/components/upload/image-uploader'

export function ProductImageUploadExample() {
  const [productImage, setProductImage] = useState<string | null>(null)

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Foto do Produto</h2>
      
      <ImageUploader
        category="product"
        maxSize={5 * 1024 * 1024} // 5 MB
        previewWidth={400}
        previewHeight={400}
        buttonText="Selecionar Foto"
        useDirectUpload={true}
        allowRemove={true}
        currentImageUrl={productImage}
        onUploadComplete={(result) => {
          console.log('Foto do produto enviada:', result)
          setProductImage(result.url)
          
          // Salvar no banco de dados
          // await updateProduct(productId, {
          //   imageKey: result.key,
          //   imageUrl: result.url,
          // })
        }}
        onRemove={() => {
          setProductImage(null)
          // await updateProduct(productId, {
          //   imageKey: null,
          //   imageUrl: null,
          // })
        }}
        onError={(error) => {
          console.error('Erro ao enviar foto:', error)
        }}
      />
    </div>
  )
}

/**
 * Exemplo: Upload múltiplo de fotos de produto
 */
export function MultipleProductImagesExample() {
  const [images, setImages] = useState<string[]>([])

  const handleUpload = (result: any) => {
    setImages((prev) => [...prev, result.url])
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Galeria do Produto</h2>
      
      <div className="grid grid-cols-3 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative aspect-square">
            <img
              src={url}
              alt={`Produto ${index + 1}`}
              className="w-full h-full object-cover rounded"
            />
          </div>
        ))}
        
        {images.length < 6 && (
          <ImageUploader
            category="product"
            previewWidth={200}
            previewHeight={200}
            useDirectUpload={true}
            onUploadComplete={handleUpload}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. UPLOAD DE DOCUMENTOS DE CONTRATOS
// ---------------------------------------------------------------------------

/**
 * Exemplo: Upload de contrato
 */
export function ContractUploadExample() {
  const [contract, setContract] = useState<any>(null)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Upload de Contrato</h2>
      
      <FileUploader
        category="contract"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        maxSize={10 * 1024 * 1024} // 10 MB
        buttonText="Selecionar Contrato"
        description="Arraste o arquivo do contrato aqui (PDF ou Word)"
        useDirectUpload={true}
        onUploadComplete={(result) => {
          console.log('Contrato enviado:', result)
          setContract(result)
          
          // Salvar no banco de dados
          // await db.contract.update({
          //   where: { id: contractId },
          //   data: {
          //     documentKey: result.key,
          //     documentName: result.fileName,
          //     documentSize: result.size,
          //     uploadedAt: new Date(),
          //   }
          // })
        }}
        onError={(error) => {
          console.error('Erro ao enviar contrato:', error)
        }}
      />

      {contract && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold mb-2">Contrato Enviado</h3>
          <p className="text-sm">Nome: {contract.fileName}</p>
          <p className="text-sm">Tamanho: {(contract.size / 1024).toFixed(2)} KB</p>
          <button
            type="button"
            className="mt-2 text-blue-600 hover:underline text-sm"
            onClick={async () => {
              // Gerar URL de download
              const response = await fetch(
                `/api/storage/files/${encodeURIComponent(contract.key)}`
              )
              const data = await response.json()
              window.open(data.downloadUrl, '_blank')
            }}
          >
            Baixar Contrato
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. BACKUP DE RELATÓRIOS
// ---------------------------------------------------------------------------

/**
 * Exemplo: Gerar e fazer upload de relatório
 */
import { uploadReport } from '@/lib/storage/upload'

export async function generateAndUploadReport() {
  try {
    // 1. Gerar o relatório (exemplo com PDF)
    const reportData = await generateFinancialReport()
    
    // 2. Converter para File
    const blob = new Blob([reportData], { type: 'application/pdf' })
    const fileName = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`
    const file = new File([blob], fileName, { type: 'application/pdf' })

    // 3. Upload para R2
    const result = await uploadReport(file)

    console.log('Relatório enviado:', result)
    
    // 4. Salvar referência no banco
    // await db.report.create({
    //   data: {
    //     name: 'Relatório Financeiro',
    //     type: 'FINANCIAL',
    //     fileKey: result.key,
    //     fileName: result.fileName,
    //     fileSize: result.size,
    //     generatedAt: new Date(),
    //   }
    // })

    return result
  } catch (error) {
    console.error('Erro ao gerar/enviar relatório:', error)
    throw error
  }
}

async function generateFinancialReport(): Promise<ArrayBuffer> {
  // Implementação da geração do relatório
  // Pode usar @react-pdf/renderer ou outra biblioteca
  return new ArrayBuffer(0)
}

/**
 * Exemplo: Listar e baixar relatórios
 */
import { listReports, generatePresignedDownloadUrl } from '@/lib/storage/download'

export async function listAndDownloadReports() {
  try {
    // Listar todos os relatórios
    const reports = await listReports()

    console.log('Relatórios encontrados:', reports.length)

    for (const report of reports) {
      console.log(`- ${report.key} (${report.size} bytes)`)
      
      // Gerar URL de download
      const downloadUrl = await generatePresignedDownloadUrl(report.key, {
        expiresIn: 3600, // 1 hora
        forceDownload: true,
      })

      console.log(`  URL: ${downloadUrl}`)
    }

    return reports
  } catch (error) {
    console.error('Erro ao listar relatórios:', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// 5. INTEGRAÇÃO COM FORMULÁRIOS
// ---------------------------------------------------------------------------

/**
 * Exemplo: Formulário de produto com upload de imagem
 */
import { useForm } from 'react-hook-form'

interface ProductFormData {
  name: string
  description: string
  price: number
  imageKey?: string
}

export function ProductFormExample() {
  const { register, handleSubmit, setValue } = useForm<ProductFormData>()
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Salvar produto no banco de dados
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        alert('Produto cadastrado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold">Cadastrar Produto</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Nome</label>
        <input
          {...register('name', { required: true })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea
          {...register('description')}
          className="w-full px-3 py-2 border rounded"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Preço</label>
        <input
          type="number"
          step="0.01"
          {...register('price', { required: true })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Imagem</label>
        <ImageUploader
          category="product"
          useDirectUpload={true}
          currentImageUrl={imagePreview}
          onUploadComplete={(result) => {
            setValue('imageKey', result.key)
            setImagePreview(result.url)
          }}
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Cadastrar Produto
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// 6. DOWNLOAD DE ARQUIVOS
// ---------------------------------------------------------------------------

/**
 * Exemplo: Botão de download de arquivo
 */
export function DownloadButton({ fileKey, fileName }: { fileKey: string; fileName: string }) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    try {
      setLoading(true)

      // Gerar URL de download
      const response = await fetch(
        `/api/storage/files/${encodeURIComponent(fileKey)}?action=download&fileName=${encodeURIComponent(fileName)}`
      )

      if (!response.ok) {
        throw new Error('Erro ao gerar URL de download')
      }

      const data = await response.json()

      // Abrir URL em nova aba
      window.open(data.downloadUrl, '_blank')
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      alert('Erro ao baixar arquivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Gerando...' : 'Baixar'}
    </button>
  )
}

/**
 * Exemplo: Excluir arquivo
 */
export function DeleteFileButton({ fileKey, onDelete }: { fileKey: string; onDelete: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) {
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        `/api/storage/files/${encodeURIComponent(fileKey)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Erro ao excluir arquivo')
      }

      alert('Arquivo excluído com sucesso!')
      onDelete()
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error)
      alert('Erro ao excluir arquivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? 'Excluindo...' : 'Excluir'}
    </button>
  )
}

'use client'

/**
 * Componente de exemplo completo: Gerenciador de Arquivos
 * 
 * Demonstra todas as funcionalidades da integração R2:
 * - Upload de arquivos
 * - Listagem de arquivos
 * - Download de arquivos
 * - Exclusão de arquivos
 * - Filtros por categoria
 */

import { useState, useEffect } from 'react'
import { FileUploader } from '@/components/upload/file-uploader'
import { Download, Trash2, File, RefreshCw } from 'lucide-react'

interface FileItem {
  key: string
  size: number
  contentType: string
  lastModified: string
}

export function FileManagerExample() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Carregar arquivos
  const loadFiles = async () => {
    setLoading(true)
    try {
      const prefix = selectedCategory === 'all' ? undefined : `${selectedCategory}/`
      const params = new URLSearchParams()
      if (prefix) params.append('prefix', prefix)

      const response = await fetch(`/api/storage/files?${params}`)
      const data = await response.json()

      if (data.success) {
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Baixar arquivo
  const downloadFile = async (key: string) => {
    try {
      const response = await fetch(
        `/api/storage/files/${encodeURIComponent(key)}?action=download`
      )
      const data = await response.json()

      if (data.success) {
        window.open(data.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      alert('Erro ao baixar arquivo')
    }
  }

  // Excluir arquivo
  const deleteFile = async (key: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/storage/files/${encodeURIComponent(key)}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        alert('Arquivo excluído com sucesso!')
        loadFiles()
      } else {
        throw new Error('Erro ao excluir arquivo')
      }
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error)
      alert('Erro ao excluir arquivo')
    }
  }

  // Formatar tamanho
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Formatar data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR')
  }

  // Carregar arquivos ao montar e quando mudar categoria
  useEffect(() => {
    loadFiles()
  }, [selectedCategory])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciador de Arquivos</h1>
        <button
          type="button"
          onClick={loadFiles}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Upload */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Upload de Arquivo</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Categoria</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="all">Todas</option>
            <option value="invoices">Notas Fiscais</option>
            <option value="products">Produtos</option>
            <option value="contracts">Contratos</option>
            <option value="reports">Relatórios</option>
          </select>
        </div>

        <FileUploader
          category={selectedCategory === 'all' ? undefined : selectedCategory as any}
          useDirectUpload={true}
          onUploadComplete={(result) => {
            console.log('Upload concluído:', result)
            loadFiles()
          }}
          onError={(error) => {
            console.error('Erro no upload:', error)
            alert(`Erro: ${error}`)
          }}
        />
      </div>

      {/* Lista de arquivos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">
            Arquivos ({files.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Carregando arquivos...
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum arquivo encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Arquivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {files.map((file) => (
                  <tr key={file.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {file.key.split('/').pop()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {file.contentType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(file.lastModified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => downloadFile(file.key)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFile(file.key)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total de Arquivos
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {files.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Tamanho Total
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatSize(files.reduce((acc, file) => acc + file.size, 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Categoria
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {selectedCategory === 'all' ? 'Todas' : selectedCategory}
          </p>
        </div>
      </div>
    </div>
  )
}

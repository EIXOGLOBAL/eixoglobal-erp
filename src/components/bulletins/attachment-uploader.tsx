'use client'

import { useState, useRef } from "react"
import { deleteBulletinAttachment } from "@/app/actions/bulletin-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
    Upload, Trash2, FileText, Image, Download,
    Paperclip, Loader2, X
} from "lucide-react"

type Attachment = {
    id: string
    fileName: string
    fileType: string
    fileSize: number
    fileUrl: string
    description: string | null
    createdAt: Date
    uploadedBy: { name: string | null } | null
}

interface AttachmentUploaderProps {
    bulletinId: string
    attachments: Attachment[]
    canUpload: boolean
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
    if (fileType.startsWith('image/')) return Image
    return FileText
}

export function AttachmentUploader({ bulletinId, attachments: initialAttachments, canUpload }: AttachmentUploaderProps) {
    const [attachments, setAttachments] = useState(initialAttachments)
    const [uploading, setUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    async function handleUpload(files: FileList | null) {
        if (!files || files.length === 0) return

        setUploading(true)
        const file = files[0]! // Upload one at a time (length already checked above)

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('bulletinId', bulletinId)

            const response = await fetch('/api/upload/bulletin', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (result.success) {
                setAttachments(prev => [result.data, ...prev])
                toast({ title: `${file.name} enviado com sucesso!` })
            } else {
                toast({ variant: 'destructive', title: 'Erro no upload', description: result.error })
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha na conexão ao enviar arquivo' })
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleDelete(attachmentId: string) {
        const result = await deleteBulletinAttachment(attachmentId)
        if (result.success) {
            setAttachments(prev => prev.filter(a => a.id !== attachmentId))
            toast({ title: 'Anexo removido.' })
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.error })
        }
    }

    return (
        <div className="space-y-4">
            {/* Área de Upload */}
            {canUpload && (
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault()
                        setDragOver(false)
                        handleUpload(e.dataTransfer.files)
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => handleUpload(e.target.files)}
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm font-medium">Arraste e solte arquivos aqui</p>
                            <p className="text-xs text-muted-foreground">
                                Imagens, PDF, Word, Excel — máx. 10MB por arquivo
                            </p>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="mt-2"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="h-4 w-4 mr-2" />
                                Selecionar arquivo
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Lista de Anexos */}
            {attachments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Paperclip className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p>Nenhum anexo ainda.</p>
                    {canUpload && <p className="text-xs mt-1">Use a área acima para enviar documentos e fotos.</p>}
                </div>
            ) : (
                <div className="space-y-2">
                    {attachments.map(attachment => {
                        const FileIcon = getFileIcon(attachment.fileType)
                        const isImage = attachment.fileType.startsWith('image/')
                        return (
                            <div key={attachment.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30">
                                {isImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={attachment.fileUrl}
                                        alt={attachment.fileName}
                                        className="h-10 w-10 object-cover rounded border shrink-0"
                                    />
                                ) : (
                                    <div className="h-10 w-10 bg-muted flex items-center justify-center rounded border shrink-0">
                                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(attachment.fileSize)} •{' '}
                                        {attachment.uploadedBy?.name || 'Usuário'} •{' '}
                                        {new Date(attachment.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                    {attachment.description && (
                                        <p className="text-xs text-muted-foreground italic">{attachment.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        asChild
                                    >
                                        <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                    {canUpload && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(attachment.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

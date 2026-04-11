'use client'

import { useState } from "react"
import { addBulletinComment, deleteBulletinComment } from "@/app/actions/bulletin-actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare, Send, Trash2, AlertCircle, CheckCircle, HelpCircle, Eye } from "lucide-react"
import { formatDateTime } from "@/lib/formatters"

type Comment = {
    id: string
    text: string
    commentType: string
    isInternal: boolean
    createdAt: Date
    author: { name: string | null } | null
}

interface CommentsSectionProps {
    bulletinId: string
    comments: Comment[]
    bulletinStatus: string
}

const typeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    OBSERVATION: { label: 'Observação', color: 'bg-blue-50 border-blue-200 text-blue-900', icon: Eye },
    QUESTION: { label: 'Dúvida', color: 'bg-yellow-50 border-yellow-200 text-yellow-900', icon: HelpCircle },
    APPROVAL: { label: 'Aprovação', color: 'bg-green-50 border-green-200 text-green-900', icon: CheckCircle },
    REJECTION: { label: 'Rejeição', color: 'bg-red-50 border-red-200 text-red-900', icon: AlertCircle },
}

export function CommentsSection({ bulletinId, comments: initialComments, bulletinStatus }: CommentsSectionProps) {
    const [comments, setComments] = useState(initialComments)
    const [text, setText] = useState('')
    const [commentType, setCommentType] = useState<'OBSERVATION' | 'QUESTION' | 'APPROVAL' | 'REJECTION'>('OBSERVATION')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!text.trim()) return

        setLoading(true)
        try {
            const result = await addBulletinComment(bulletinId, { text, commentType })
            if (result.success && result.data) {
                setComments(prev => [result.data as Comment, ...prev])
                setText('')
                toast({ title: 'Comentário adicionado!' })
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(commentId: string) {
        const result = await deleteBulletinComment(commentId)
        if (result.success) {
            setComments(prev => prev.filter(c => c.id !== commentId))
            toast({ title: 'Comentário removido.' })
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.error })
        }
    }

    return (
        <div className="space-y-6">
            {/* Form de Novo Comentário */}
            <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Adicionar comentário</span>
                </div>

                <Textarea
                    placeholder="Escreva uma observação, dúvida ou comentário sobre este boletim..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={3}
                    className="resize-none"
                />

                <div className="flex items-center justify-between gap-3">
                    <Select
                        value={commentType}
                        onValueChange={(v) => setCommentType(v as typeof commentType)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OBSERVATION">Observação</SelectItem>
                            <SelectItem value="QUESTION">Dúvida</SelectItem>
                            <SelectItem value="APPROVAL">Aprovação</SelectItem>
                            <SelectItem value="REJECTION">Rejeição</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button type="submit" disabled={loading || !text.trim()} size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        {loading ? 'Enviando...' : 'Enviar'}
                    </Button>
                </div>
            </form>

            {/* Lista de Comentários */}
            {comments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p>Nenhum comentário registrado.</p>
                    <p className="text-xs mt-1">Use o formulário acima para iniciar a conversa.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {comments.map(comment => {
                        const config = (typeConfig[comment.commentType] || typeConfig.OBSERVATION)!
                        const Icon = config.icon
                        return (
                            <div key={comment.id} className={`border rounded-lg p-4 ${config.color}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="font-semibold text-sm">
                                            {comment.author?.name || 'Usuário'}
                                        </span>
                                        <Badge variant="outline" className="text-xs bg-white/60">
                                            {config.label}
                                        </Badge>
                                        {comment.isInternal && (
                                            <Badge variant="secondary" className="text-xs">Interno</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs opacity-70">
                                            {formatDateTime(comment.createdAt)}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                            onClick={() => handleDelete(comment.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm mt-2 ml-6">{comment.text}</p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

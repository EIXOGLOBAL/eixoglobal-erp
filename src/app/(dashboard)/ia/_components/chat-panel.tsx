'use client'

import { useState, useRef, useEffect } from 'react'
import { chatAssistant, ChatResponse } from '@/app/actions/ai-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, Send, Trash2, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function ChatPanel() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite uma mensagem',
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await chatAssistant(input, context || undefined)

      if ('error' in result) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        })
        setMessages((prev) => prev.slice(0, -1))
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: result.timestamp,
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar mensagem'
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: message,
      })
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setInput('')
    setContext('')
    toast({
      title: 'Chat limpo',
      description: 'Histórico de mensagens removido',
    })
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: 'Copiado',
      description: 'Mensagem copiada para a área de transferência',
    })
  }

  return (
    <div className="space-y-4">
      {/* Context Input */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Contexto Opcional</CardTitle>
              <CardDescription className="text-xs">
                Adicione informações relevantes para respostas mais precisas
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContext(!showContext)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showContext ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </CardHeader>
        {showContext && (
          <CardContent>
            <Textarea
              placeholder="Ex: Analise do projeto X, dados de fevereiro, comparação com ano passado..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        )}
      </Card>

      {/* Messages */}
      <Card className="flex flex-col h-[400px]">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assistente de IA</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-4">
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Nenhuma mensagem ainda. Comece a conversa!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Você pode fazer perguntas sobre projetos, finanças, alocações e muito mais.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <div className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {message.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyMessage(message.content)}
                      className="h-auto p-1 mt-1"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <CardContent className="border-t pt-4 pb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={loading}
              className="flex-1"
            />
            <Button
 onClick={handleSendMessage}
 disabled={loading || !input.trim()}
 size="icon" aria-label="Enviar mensagem" 
>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </p>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4">
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-gray-700">Dicas de uso:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Faça perguntas sobre qualquer módulo do ERP</li>
              <li>Adicione contexto para análises mais precisas</li>
              <li>Peça recomendações e interpretações de dados</li>
              <li>Questione tendências e métricas do sistema</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

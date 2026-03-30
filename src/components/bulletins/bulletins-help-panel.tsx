'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Info, CheckCircle2, XCircle, AlertTriangle, Eye } from "lucide-react"
import { useState } from "react"

export function BulletinsHelpPanel() {
    const [open, setOpen] = useState(false)

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <Card className="bg-blue-50 border-blue-200">
                <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-blue-100 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-600" />
                                <CardTitle className="text-sm text-blue-900">Como funcionam os Boletins de Medição</CardTitle>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-0">
                    <CardContent className="space-y-4">
                        <Alert className="border-blue-300 bg-white">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="text-sm">Fluxo de Aprovação</AlertTitle>
                            <AlertDescription className="text-xs mt-2">
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">Rascunho</span>
                                    <span>→</span>
                                    <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">Aguardando Aprovação</span>
                                    <span>→</span>
                                    <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded">Aprovado</span>
                                </div>
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                    <Eye className="h-4 w-4" />
                                    Rascunho
                                </h4>
                                <p className="text-xs text-gray-700">
                                    Crie e edite livremente seu boletim. Selecione o contrato e insira as quantidades medidas. Os valores são calculados automaticamente.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    Enviando para Aprovação
                                </h4>
                                <p className="text-xs text-gray-700">
                                    Quando está pronto, clique em "Enviar para Aprovação". O boletim será bloqueado para edição e ficará visível para os aprovadores.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    Aprovado
                                </h4>
                                <p className="text-xs text-gray-700">
                                    Após aprovação pela engenharia, o boletim fica pronto para faturamento. Um analista pode revisar e aprovar a mudança para "Faturado".
                                </p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    Rejeitado
                                </h4>
                                <p className="text-xs text-gray-700">
                                    Se rejeitado, o boletim volta para edição. Você pode corrigir os valores e reenviá-lo. Verifique o motivo da rejeição.
                                </p>
                            </div>
                        </div>

                        <Alert className="bg-white border-blue-300">
                            <AlertDescription className="text-xs space-y-1">
                                <p className="font-semibold">💡 Dica:</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    <li>Anexe fotos e documentação para acelerar a aprovação</li>
                                    <li>Use comentários para esclarecer dúvidas dos aprovadores</li>
                                    <li>Revise os totais antes de enviar para aprovação</li>
                                    <li>Mantenha os boletins atualizados conforme o progresso da obra</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}

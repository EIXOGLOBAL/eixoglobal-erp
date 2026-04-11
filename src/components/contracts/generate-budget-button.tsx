'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { generateBudgetFromContract } from "@/app/actions/budget-actions"
import { Calculator, Loader2 } from "lucide-react"

interface GenerateBudgetButtonProps {
    contractId: string
    hasItems: boolean
}

export function GenerateBudgetButton({ contractId, hasItems }: GenerateBudgetButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    async function handleGenerate() {
        setLoading(true)
        try {
            const result = await generateBudgetFromContract(contractId)
            if (result.success && result.data) {
                toast({
                    title: "Orcamento gerado com sucesso",
                    description: `Orcamento "${result.data.name}" criado a partir do contrato.`,
                })
                router.push(`/orcamentos/${result.data.id}`)
            } else {
                toast({
                    title: "Erro ao gerar orcamento",
                    description: result.error || "Erro desconhecido",
                    variant: "destructive",
                })
            }
        } catch {
            toast({
                title: "Erro ao gerar orcamento",
                description: "Ocorreu um erro inesperado. Tente novamente.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={loading || !hasItems}
            title={!hasItems ? "O contrato precisa ter itens para gerar um orcamento" : "Gerar orcamento a partir dos itens do contrato"}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <Calculator className="h-4 w-4 mr-2" />
            )}
            Gerar Orcamento
        </Button>
    )
}

'use client'

import Link from "next/link"
import { ArrowLeft, Calendar, Users, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface BulletinDetailsHeaderProps {
    bulletinNumber: string
    bulletinStatus: string
    projectName: string
    contractIdentifier: string
    referenceMonth: string
    bulletinId: string
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "outline",
    PENDING_APPROVAL: "default",
    APPROVED: "secondary",
    REJECTED: "destructive",
    BILLED: "secondary",
}

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    BILLED: "Faturado",
}

export function BulletinDetailsHeader({
    bulletinNumber,
    bulletinStatus,
    projectName,
    contractIdentifier,
    referenceMonth,
    bulletinId,
}: BulletinDetailsHeaderProps) {
    return (
        <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild aria-label="Voltar">
                <Link href="/measurements">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {bulletinNumber}
                    </h1>
                    <Badge variant={statusVariants[bulletinStatus]} className="text-sm">
                        {statusLabels[bulletinStatus]}
                    </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{projectName}</span>
                    <span>•</span>
                    <span className="font-medium text-foreground">{contractIdentifier}</span>
                    <span>•</span>
                    <span>{referenceMonth}</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/measurements/${bulletinId}/print`} target="_blank">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Link>
                </Button>
            </div>
        </div>
    )
}

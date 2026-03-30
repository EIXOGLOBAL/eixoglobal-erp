import Link from "next/link"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Building2,
    Calendar,
    DollarSign,
    FileText,
    Users,
    Clock,
    CheckCircle,
    AlertCircle,
} from "lucide-react"

interface ContractDetailsProps {
    contract: any
    statusVariants: Record<string, any>
    statusLabels: Record<string, string>
}

export function ContractDetailsSection({
    contract,
    statusVariants,
    statusLabels,
}: ContractDetailsProps) {
    const isExpiring = () => {
        if (!contract.endDate || contract.status !== 'ACTIVE') return false
        const today = new Date()
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(today.getDate() + 30)
        const endDate = new Date(contract.endDate)
        return endDate >= today && endDate <= thirtyDaysFromNow
    }

    const isExpired = () => {
        if (!contract.endDate) return false
        return new Date(contract.endDate) < new Date()
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Projeto */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Projeto</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Link
                        href={`/projects/${contract.project.id}`}
                        className="text-base font-bold hover:underline text-primary"
                    >
                        {contract.project.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                        Projeto vinculado
                    </p>
                </CardContent>
            </Card>

            {/* Contratada */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Contratada</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-base font-bold">
                        {contract.contractor?.name || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Empresa contratada
                    </p>
                </CardContent>
            </Card>

            {/* Valor do Contrato */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Valor Contratado</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-base font-bold text-green-700 dark:text-green-400">
                        {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                        }).format(Number(contract.value || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Valor total do contrato
                    </p>
                </CardContent>
            </Card>

            {/* Período de Vigência */}
            <Card className={`hover:shadow-md transition-shadow ${isExpiring() ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' : isExpired() ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : ''}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Vigência</CardTitle>
                        <Calendar className="h-4 w-4 text-orange-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div>
                            <p className="text-xs text-muted-foreground">Início</p>
                            <p className="text-sm font-medium">
                                {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Término</p>
                            <p className={`text-sm font-medium ${isExpired() ? 'text-red-700 dark:text-red-400' : isExpiring() ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                                {contract.endDate
                                    ? new Date(contract.endDate).toLocaleDateString('pt-BR')
                                    : 'Indeterminado'
                                }
                            </p>
                            {isExpiring() && (
                                <div className="flex items-center gap-1 mt-1 text-amber-600 text-xs">
                                    <AlertCircle className="h-3 w-3" />
                                    Vencendo em breve
                                </div>
                            )}
                            {isExpired() && (
                                <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                                    <AlertCircle className="h-3 w-3" />
                                    Expirado
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

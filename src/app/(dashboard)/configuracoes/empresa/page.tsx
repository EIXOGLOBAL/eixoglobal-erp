import { requireAdmin } from "@/lib/route-guard"
import { getCompanyDetails } from "@/app/actions/company-actions"
import { CompanyForm } from "@/components/configuracoes/company-form"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function EmpresaSettingsPage() {
    await requireAdmin()

    const result = await getCompanyDetails()

    if (!result.success || !result.data) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Link
                    href="/configuracoes"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Configurações
                </Link>
                <Card>
                    <CardContent className="py-10 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            {result.error || 'Nenhuma empresa vinculada. Entre em contato com o administrador.'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const company = result.data

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/configuracoes"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Configurações
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Building2 className="h-8 w-8" />
                        Dados da Empresa
                    </h2>
                    <p className="text-muted-foreground">
                        Gerencie as informações cadastrais da sua empresa
                    </p>
                </div>
            </div>

            <CompanyForm
                company={{
                    id: company.id,
                    name: company.name,
                    tradeName: company.tradeName,
                    cnpj: company.cnpj,
                    email: company.email,
                    phone: company.phone,
                    address: company.address,
                    city: company.city,
                    state: company.state,
                    zipCode: company.zipCode,
                    logoUrl: company.logoUrl,
                }}
            />
        </div>
    )
}

import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = 'force-dynamic'

export default async function PrivacidadePage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return (<div className="flex-1 max-w-3xl mx-auto space-y-6 p-4 md:p-8 pt-6">
    <div className="flex items-center gap-3"><Button variant="ghost" size="icon" asChild><Link href="/termos"><ArrowLeft className="h-4 w-4" /></Link></Button><Shield className="h-8 w-8" /><div><h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1><p className="text-muted-foreground">Conformidade LGPD &mdash; Lei nº 13.709/2018</p></div></div>
    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded-lg"><AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" /><p className="text-sm text-yellow-800 font-medium">EDITAR ANTES DE COLOCAR EM PRODUÇÃO &mdash; Consulte um advogado especializado em LGPD.</p></div>
    <Card><CardHeader><CardTitle>1. Dados Coletados</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-2"><p>O Sistema coleta: nome completo, CPF, e-mail, cargo, departamento, salário, habilidades, logs de acesso e dados financeiros de funcionários.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>2. Finalidade do Tratamento</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-2"><p>Os dados são tratados para gestão de RH, folha de pagamento, controle de acesso, relatórios operacionais, conformidade legal (CLT, eSocial) e auditoria de operações.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>3. Retenção de Dados</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-2"><p>Dados de funcionários: 5 anos após desligamento. Registros financeiros: 10 anos. Logs de acesso: 6 meses. Usuários inativos: excluídos após 90 dias.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>4. Direitos do Titular (LGPD Art. 18)</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-2"><p>Você tem direito de: acessar seus dados, corrigir informações incorretas, solicitar exclusão, portabilidade dos dados e revogar consentimento. Contate o DPO para exercer seus direitos.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>5. Contato &mdash; DPO</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-2"><p>Nome: [INSERIR NOME DO DPO]<br />E-mail: [INSERIR EMAIL DO DPO]<br />Telefone: [INSERIR TELEFONE]</p><p className="text-xs mt-2">EDITAR ANTES DE COLOCAR EM PRODUÇÃO &mdash; Versão 1.0</p></CardContent></Card>
    <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><Link href="/termos" className="text-sm text-primary hover:underline">← Voltar aos Termos de Uso</Link></div>
  </div>)
}
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { FileText, Shield, AlertTriangle } from "lucide-react"

export default async function TermosPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="flex-1 max-w-3xl mx-auto space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
          <p className="text-muted-foreground">Eixo Global ERP &mdash; Versão 1.0</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
          EDITAR ANTES DE COLOCAR EM PRODUÇÃO &mdash; Este texto é um modelo de placeholder.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Definições</CardTitle></CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-2">
          <p>Para os fins destes Termos de Uso, consideram-se:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><strong>Sistema:</strong> a plataforma Eixo Global ERP e todos os seus módulos.</li>
            <li><strong>Usuário:</strong> toda pessoa física ou jurídica que acessa e utiliza o Sistema.</li>
            <li><strong>Empresa:</strong> a organização contratante que utiliza o Sistema para gestão de suas operações.</li>
            <li><strong>Dados:</strong> informações inseridas, processadas e armazenadas no Sistema.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Uso do Sistema</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>O acesso ao Sistema é concedido exclusivamente para fins profissionais, no contexto das atividades da Empresa contratante. O Usuário compromete-se a:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Utilizar o Sistema apenas para finalidades lícitas e de acordo com a legislação vigente.</li>
            <li>Não compartilhar suas credenciais de acesso com terceiros.</li>
            <li>Manter a confidencialidade das informações acessadas.</li>
            <li>Reportar imediatamente qualquer uso não autorizado ao administrador do sistema.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>3. Responsabilidades</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Responsabilidades do Usuário:</strong> O Usuário é responsável pela exatidão dos dados inseridos no Sistema e pelo uso adequado das funcionalidades disponíveis.</p>
          <p><strong>Responsabilidades da Empresa:</strong> A Empresa é responsável por garantir que seus funcionários utilizem o Sistema em conformidade com estes Termos e com a política interna da organização.</p>
          <p><strong>Limitação de Responsabilidade:</strong> O fornecedor do Sistema não se responsabiliza por decisões tomadas com base nas informações geradas pelo Sistema, cabendo ao Usuário a validação das informações.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>4. Privacidade dos Dados</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>O tratamento dos dados pessoais é realizado em conformidade com a Lei Geral de Proteção de Dados (LGPD &mdash; Lei nº 13.709/2018). Para informações detalhadas sobre como seus dados são coletados, utilizados e armazenados, consulte nossa{" "}
            <Link href="/termos/privacidade" className="text-primary hover:underline font-medium">Política de Privacidade</Link>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>5. Contato</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Para dúvidas, sugestões ou solicitações relacionadas a estes Termos de Uso, entre em contato com o administrador do sistema ou pelo endereço de e-mail: <strong>[INSERIR EMAIL DE CONTATO]</strong>.</p>
          <p className="text-xs mt-4">Data da última atualização: [INSERIR DATA]</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <Link href="/termos/privacidade" className="text-sm text-primary hover:underline">
          Ver Política de Privacidade (LGPD)
        </Link>
      </div>
    </div>
  )
}
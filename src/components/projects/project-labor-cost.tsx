import { getProjectLaborCost } from "@/app/actions/project-actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, Clock, DollarSign, AlertCircle } from "lucide-react"

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatHours = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value)

interface ProjectLaborCostProps {
  projectId: string
}

export async function ProjectLaborCost({ projectId }: ProjectLaborCostProps) {
  const result = await getProjectLaborCost(projectId)

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {"Custo de M\u00e3o de Obra"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {result.error || "Erro ao carregar dados de custo de m\u00e3o de obra."}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { employees, totalHours, totalCost, averageCostPerHour } = result.data

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{"Custo de M\u00e3o de Obra"}</CardTitle>
          <CardDescription>
            {"An\u00e1lise de custo por funcion\u00e1rio alocado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{"Nenhum funcion\u00e1rio alocado ativamente neste projeto."}</p>
            <p className="text-sm mt-1">
              {"Aloque funcion\u00e1rios na aba Equipe para visualizar os custos."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{"Custo de M\u00e3o de Obra"}</CardTitle>
        <CardDescription>
          {"An\u00e1lise de custo por funcion\u00e1rio alocado no projeto"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cards de totaliza\u00e7\u00e3o */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-muted-foreground">Total de Horas</p>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {formatHours(totalHours)}h
            </p>
          </div>

          <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <p className="text-xs text-muted-foreground">Custo Total</p>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {formatBRL(totalCost)}
            </p>
          </div>

          <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-xs text-muted-foreground">{"Custo M\u00e9dio/Hora"}</p>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatBRL(averageCostPerHour)}
            </p>
          </div>
        </div>

        {/* Tabela detalhada */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{"Funcion\u00e1rio"}</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead className="text-right">Custo/Hora</TableHead>
              <TableHead className="text-right">Custo Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.employeeId}>
                <TableCell className="font-medium">{emp.employeeName}</TableCell>
                <TableCell className="text-muted-foreground">{emp.jobTitle}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatHours(emp.totalHours)}h
                </TableCell>
                <TableCell className="text-right">
                  {emp.costPerHour > 0 ? formatBRL(emp.costPerHour) : (
                    <span className="text-xs text-muted-foreground">{"N\u00e3o definido"}</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatBRL(emp.totalCost)}
                </TableCell>
              </TableRow>
            ))}
            {/* Linha de total */}
            <TableRow className="border-t-2 font-bold">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right font-mono">
                {formatHours(totalHours)}h
              </TableCell>
              <TableCell className="text-right">
                {formatBRL(averageCostPerHour)}
              </TableCell>
              <TableCell className="text-right">
                {formatBRL(totalCost)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Aviso para funcion\u00e1rios sem custo definido */}
        {employees.some(e => e.costPerHour === 0) && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              {"Alguns funcion\u00e1rios n\u00e3o possuem custo/hora ou sal\u00e1rio definido. Atualize o cadastro do funcion\u00e1rio para que o custo seja calculado corretamente."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

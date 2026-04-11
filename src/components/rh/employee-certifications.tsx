import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDate } from "@/lib/formatters"
import { Award, AlertTriangle, CheckCircle2, Clock } from "lucide-react"

/**
 * Validade padrão para certificações NR (em meses).
 * NR-10 = 24 meses, NR-35 = 24 meses, NR-33 = 12 meses.
 * Usamos 24 meses como padrão conservador.
 */
const NR_DEFAULT_VALIDITY_MONTHS = 24

interface Certification {
    id: string
    trainingId: string
    title: string
    type: string
    status: string
    startDate: Date
    endDate: Date | null
    hours: number
    instructor: string | null
    attended: boolean
    certified: boolean
    notes: string | null
}

const typeLabels: Record<string, string> = {
    INTERNAL: "Interno",
    EXTERNAL: "Externo",
    NR: "NR",
    CERTIFICATION: "Certificacao",
    OTHER: "Outro",
}

const typeBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    INTERNAL: "secondary",
    EXTERNAL: "outline",
    NR: "default",
    CERTIFICATION: "default",
    OTHER: "secondary",
}

const statusLabels: Record<string, string> = {
    SCHEDULED: "Agendado",
    IN_PROGRESS: "Em Andamento",
    COMPLETED: "Concluido",
    CANCELLED: "Cancelado",
}

function isNRExpired(cert: Certification): boolean {
    if (cert.type !== "NR") return false
    // Use endDate if available, otherwise startDate as reference
    const referenceDate = cert.endDate ? new Date(cert.endDate) : new Date(cert.startDate)
    const expirationDate = new Date(referenceDate)
    expirationDate.setMonth(expirationDate.getMonth() + NR_DEFAULT_VALIDITY_MONTHS)
    return expirationDate < new Date()
}

function isNRExpiringSoon(cert: Certification): boolean {
    if (cert.type !== "NR") return false
    if (isNRExpired(cert)) return false
    const referenceDate = cert.endDate ? new Date(cert.endDate) : new Date(cert.startDate)
    const expirationDate = new Date(referenceDate)
    expirationDate.setMonth(expirationDate.getMonth() + NR_DEFAULT_VALIDITY_MONTHS)
    const warningDate = new Date()
    warningDate.setMonth(warningDate.getMonth() + 3) // Alert 3 months before
    return expirationDate <= warningDate
}

function getNRExpirationDate(cert: Certification): Date {
    const referenceDate = cert.endDate ? new Date(cert.endDate) : new Date(cert.startDate)
    const expirationDate = new Date(referenceDate)
    expirationDate.setMonth(expirationDate.getMonth() + NR_DEFAULT_VALIDITY_MONTHS)
    return expirationDate
}

export function EmployeeCertifications({ certifications }: { certifications: Certification[] }) {
    const expiredNRCerts = certifications.filter(isNRExpired)
    const expiringNRCerts = certifications.filter(isNRExpiringSoon)
    const certifiedCount = certifications.filter(c => c.certified).length
    const attendedOnlyCount = certifications.filter(c => c.attended && !c.certified).length

    return (
        <div className="space-y-4">
            {/* Alert for expired NR certifications */}
            {expiredNRCerts.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Certificacao NR Vencida</AlertTitle>
                    <AlertDescription>
                        {expiredNRCerts.length === 1
                            ? `O treinamento "${expiredNRCerts[0].title}" esta com a certificacao vencida. Providencie a reciclagem.`
                            : `${expiredNRCerts.length} certificacoes NR estao vencidas: ${expiredNRCerts.map(c => c.title).join(', ')}. Providencie a reciclagem.`
                        }
                    </AlertDescription>
                </Alert>
            )}

            {/* Warning for NR certifications expiring soon */}
            {expiringNRCerts.length > 0 && (
                <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Certificacao NR Proxima do Vencimento</AlertTitle>
                    <AlertDescription>
                        {expiringNRCerts.length === 1
                            ? `O treinamento "${expiringNRCerts[0].title}" vence em ${formatDate(getNRExpirationDate(expiringNRCerts[0]))}. Agende a reciclagem com antecedencia.`
                            : `${expiringNRCerts.length} certificacoes NR vencem em breve: ${expiringNRCerts.map(c => `${c.title} (${formatDate(getNRExpirationDate(c))})`).join(', ')}.`
                        }
                    </AlertDescription>
                </Alert>
            )}

            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    {certifiedCount} certificacao{certifiedCount !== 1 ? 'oes' : ''}
                </span>
                {attendedOnlyCount > 0 && (
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {attendedOnlyCount} presenca{attendedOnlyCount !== 1 ? 's' : ''} sem certificacao
                    </span>
                )}
            </div>

            {certifications.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Treinamento</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Carga Horaria</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Certificado</TableHead>
                            {certifications.some(c => c.type === "NR") && (
                                <TableHead>Validade NR</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {certifications.map(cert => {
                            const expired = isNRExpired(cert)
                            const expiringSoon = isNRExpiringSoon(cert)
                            return (
                                <TableRow
                                    key={cert.id}
                                    className={expired ? "bg-destructive/5" : expiringSoon ? "bg-yellow-50 dark:bg-yellow-900/10" : undefined}
                                >
                                    <TableCell className="font-medium">
                                        <div>
                                            {cert.title}
                                            {cert.instructor && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Instrutor: {cert.instructor}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={typeBadgeVariants[cert.type] || "secondary"}>
                                            {typeLabels[cert.type] || cert.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {formatDate(cert.startDate)}
                                            {cert.endDate && cert.endDate !== cert.startDate && (
                                                <span className="text-muted-foreground">
                                                    {" "}a {formatDate(cert.endDate)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{cert.hours}h</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                cert.status === "COMPLETED" ? "default"
                                                    : cert.status === "CANCELLED" ? "destructive"
                                                        : "outline"
                                            }
                                        >
                                            {statusLabels[cert.status] || cert.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {cert.certified ? (
                                            <Badge variant="default" className="bg-green-600">
                                                <Award className="h-3 w-3 mr-1" />
                                                Certificado
                                            </Badge>
                                        ) : cert.attended ? (
                                            <Badge variant="secondary">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Presente
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">Pendente</Badge>
                                        )}
                                    </TableCell>
                                    {certifications.some(c => c.type === "NR") && (
                                        <TableCell>
                                            {cert.type === "NR" ? (
                                                <div className="flex items-center gap-1.5">
                                                    {expired ? (
                                                        <Badge variant="destructive">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Vencida
                                                        </Badge>
                                                    ) : expiringSoon ? (
                                                        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            Vence {formatDate(getNRExpirationDate(cert))}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            Ate {formatDate(getNRExpirationDate(cert))}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">
                    Nenhuma certificacao ou treinamento registrado para este funcionario.
                </div>
            )}
        </div>
    )
}

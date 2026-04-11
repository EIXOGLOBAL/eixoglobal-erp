import { getEmployeeById } from "@/app/actions/employee-actions"
import { getEmployeeCertifications } from "@/app/actions/training-actions"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { PrintEmployeeClient } from "@/components/rh/print-employee-client"

export const dynamic = 'force-dynamic'

export default async function PrintEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session) redirect("/login")

    const result = await getEmployeeById(id)
    // getEmployeeById retorna null, { success: false, error } ou o objeto employee
    if (!result || 'success' in result) notFound()

    const employee = result

    // Buscar info da empresa
    const company = await prisma.company.findUnique({
        where: { id: employee.companyId },
        select: {
            id: true,
            name: true,
            cnpj: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
        },
    })

    // Buscar treinamentos/certificacoes do funcionario
    // Retorna array plano com dados do treinamento inline (sem .training aninhado)
    const certifications = await getEmployeeCertifications(id)

    return (
        <PrintEmployeeClient
            employee={{
                id: employee.id,
                matricula: employee.matricula ?? null,
                name: employee.name,
                jobTitle: employee.jobTitle,
                document: employee.document ?? null,
                status: employee.status,
                department: employee.department ?? null,
                admissionDate: employee.admissionDate ?? null,
                leaveDate: employee.leaveDate ?? null,
                terminationDate: employee.terminationDate ?? null,
                monthlySalary: employee.monthlySalary ?? null,
                costPerHour: employee.costPerHour ?? null,
                hoursPerMonth: employee.hoursPerMonth,
                housed: employee.housed,
                valeTransporte: employee.valeTransporte,
                vtDailyValue: employee.vtDailyValue ?? null,
                valeAlimentacao: employee.valeAlimentacao ?? null,
                planoSaude: employee.planoSaude ?? null,
                outrosBeneficios: employee.outrosBeneficios ?? null,
                bankName: employee.bankName ?? null,
                bankAgency: employee.bankAgency ?? null,
                bankAccount: employee.bankAccount ?? null,
                pixKey: employee.pixKey ?? null,
                emergencyContactName: employee.emergencyContactName ?? null,
                emergencyContactPhone: employee.emergencyContactPhone ?? null,
                allocations: employee.allocations.map(a => ({
                    id: a.id,
                    startDate: a.startDate,
                    endDate: a.endDate ?? null,
                    project: {
                        id: a.project.id,
                        name: a.project.name,
                        code: a.project.code ?? null,
                        status: a.project.status,
                    },
                })),
                variableBenefits: employee.variableBenefits.map(b => ({
                    id: b.id,
                    name: b.name,
                    type: b.type,
                    value: b.value,
                    isActive: b.isActive,
                })),
                trainingParticipations: certifications.map(c => ({
                    id: c.id,
                    attended: c.attended,
                    certified: c.certified,
                    training: {
                        id: c.trainingId,
                        title: c.title,
                        type: c.type,
                        status: c.status,
                        startDate: c.startDate,
                        endDate: c.endDate ?? null,
                        hours: c.hours,
                        instructor: c.instructor ?? null,
                    },
                })),
                salaryHistory: employee.salaryHistory.map(h => ({
                    id: h.id,
                    previousCost: h.previousCost,
                    newCost: h.newCost,
                    reason: h.reason ?? null,
                    effectiveDate: h.effectiveDate,
                })),
            }}
            company={company}
        />
    )
}

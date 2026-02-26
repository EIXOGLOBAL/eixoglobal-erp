'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function createBankAccount(data: {
    name: string;
    bankName: string;
    accountNumber: string;
    agency: string;
    companyId?: string; // Optional, defaults to finding first company
}) {
    try {
        // Find company (for MVP, just grab the first one if not provided)
        let companyId = data.companyId
        if (!companyId) {
            const company = await prisma.company.findFirst()
            if (company) companyId = company.id
        }

        if (!companyId) {
            // Create a default company if none exists (just for safety in dev)
            const newCompany = await prisma.company.create({
                data: {
                    name: "Minha Empresa",
                    cnpj: "00.000.000/0001-00"
                }
            })
            companyId = newCompany.id
        }

        await prisma.bankAccount.create({
            data: {
                name: data.name,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                agency: data.agency,
                companyId: companyId
            }
        })

        revalidatePath("/configuracoes")
        revalidatePath("/financeiro/faturamento")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getBankAccounts() {
    try {
        const accounts = await prisma.bankAccount.findMany()
        return { success: true, data: accounts }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getCompanySettings() {
    try {
        const company = await prisma.company.findFirst()
        return { success: true, data: company }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const companySchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    cnpj: z.string().length(14, "CNPJ deve ter 14 caracteres"),
    address: z.string().optional().nullable(),
})

export type CreateCompanyState = {
    errors?: {
        name?: string[];
        cnpj?: string[];
        address?: string[];
    };
    message?: string | null;
    success?: boolean;
};

export async function createCompany(
    prevState: CreateCompanyState,
    formData: FormData
) {
    const result = companySchema.safeParse({
        name: formData.get("name"),
        cnpj: (formData.get("cnpj") as string)?.replace(/\D/g, ''),
        address: formData.get("address"),
    });

    if (!result.success) {
        console.error("Validation Error:", result.error.flatten().fieldErrors);
        return {
            errors: result.error.flatten().fieldErrors,
            message: "Campos inválidos. Verifique os erros.",
            success: false
        };
    }

    try {
        // Check for existing CNPJ
        const existing = await prisma.company.findUnique({
            where: { cnpj: result.data.cnpj }
        })

        if (existing) {
            return {
                message: "Já existe uma empresa cadastrada com este CNPJ.",
                success: false
            }
        }

        await prisma.company.create({
            data: result.data,
        });

        revalidatePath("/companies");
        return { message: "Empresa criada com sucesso!", success: true };
    } catch (error) {
        console.error(error);
        return {
            message: "Erro no banco de dados.",
            success: false
        };
    }
}

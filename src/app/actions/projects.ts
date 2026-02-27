'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProjectStatus } from "@/lib/generated/prisma"

const createProjectSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Data inválida",
    }),
    endDate: z.string().optional().nullable().refine((date) => !date || !isNaN(Date.parse(date)), {
        message: "Data inválida",
    }),
    status: z.nativeEnum(ProjectStatus).default("PLANNING"),
    companyId: z.string().uuid(),
    engineerId: z.string().uuid().optional().nullable(),
})

const updateProjectSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    status: z.nativeEnum(ProjectStatus),
    companyId: z.string().uuid(),
    engineerId: z.string().uuid().optional().nullable(),
})

export type ProjectActionState = {
    errors?: {
        name?: string[];
        startDate?: string[];
        companyId?: string[];
    };
    message?: string | null;
    success?: boolean;
};

export async function createProject(
    prevState: ProjectActionState,
    formData: FormData
) {
    const result = createProjectSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
        location: formData.get("location"),
        startDate: formData.get("startDate"), // YYYY-MM-DD
        endDate: formData.get("endDate") || null,
        status: formData.get("status") || "PLANNING",
        companyId: formData.get("companyId"),
        engineerId: formData.get("engineerId") || null,
    });

    if (!result.success) {
        console.error("Validation Error:", result.error.flatten().fieldErrors);
        return {
            errors: result.error.flatten().fieldErrors,
            message: "Campos inválidos. Verifique os erros.",
            success: false
        };
    }

    const { startDate, endDate, name, description, location, status, companyId, engineerId } = result.data

    try {
        await prisma.project.create({
            data: {
                name,
                description,
                location,
                status,
                companyId,
                engineerId: engineerId || null,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
            },
        });

        revalidatePath("/projects");
        return { message: "Projeto criado com sucesso!", success: true };
    } catch (error) {
        console.error(error);
        return {
            message: "Erro ao criar projeto no banco de dados.",
            success: false
        };
    }
}

export async function updateProject(
    prevState: ProjectActionState,
    formData: FormData
) {
    const rawStartDate = formData.get("startDate") as string;
    const rawEndDate = formData.get("endDate") as string;

    const result = updateProjectSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        description: formData.get("description"),
        location: formData.get("location"),
        startDate: rawStartDate,
        endDate: rawEndDate || null,
        status: formData.get("status"),
        companyId: formData.get("companyId"),
        engineerId: formData.get("engineerId") || null,
    });

    if (!result.success) {
        console.error("Validation Error:", result.error.flatten().fieldErrors);
        return {
            errors: result.error.flatten().fieldErrors,
            message: "Campos inválidos.",
            success: false
        };
    }

    const { id, startDate, endDate, ...data } = result.data

    try {
        await prisma.project.update({
            where: { id },
            data: {
                ...data,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : null,
            }
        })

        revalidatePath("/projects")
        return { message: "Projeto atualizado com sucesso!", success: true }
    } catch (error) {
        console.error(error)
        return { message: "Erro ao atualizar projeto.", success: false }
    }
}

export async function deleteProject(id: string) {
    try {
        await prisma.project.delete({
            where: { id }
        })
        revalidatePath("/projects")
        return { message: "Projeto removido.", success: true }
    } catch (error) {
        console.error(error)
        return { message: "Erro ao remover projeto.", success: false }
    }
}

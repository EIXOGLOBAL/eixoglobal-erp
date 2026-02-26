'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { UserPermissions } from "@/lib/permissions"

const RoleEnum = z.enum(["ADMIN", "MANAGER", "USER", "ENGINEER"]);

const createUserSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    role: RoleEnum,
    companyId: z.string().uuid().optional().nullable(),
    canDelete: z.boolean().default(false),
    canApprove: z.boolean().default(false),
    canManageFinancial: z.boolean().default(false),
    canManageHR: z.boolean().default(false),
    canManageSystem: z.boolean().default(false),
    canViewReports: z.boolean().default(true),
})

const updateUserSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
    role: RoleEnum,
    companyId: z.string().uuid().optional().nullable(),
    canDelete: z.boolean().default(false),
    canApprove: z.boolean().default(false),
    canManageFinancial: z.boolean().default(false),
    canManageHR: z.boolean().default(false),
    canManageSystem: z.boolean().default(false),
    canViewReports: z.boolean().default(true),
})

export type UserActionState = {
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        role?: string[];
        companyId?: string[];
    };
    message?: string | null;
    success?: boolean;
};

export async function createUser(
    prevState: UserActionState,
    formData: FormData
) {
    const rawRole = formData.get("role") as string;

    const result = createUserSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: rawRole,
        companyId: formData.get("companyId") || null,
        canDelete: formData.get("canDelete") === "true",
        canApprove: formData.get("canApprove") === "true",
        canManageFinancial: formData.get("canManageFinancial") === "true",
        canManageHR: formData.get("canManageHR") === "true",
        canManageSystem: formData.get("canManageSystem") === "true",
        canViewReports: formData.get("canViewReports") !== "false",
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
        const existing = await prisma.user.findUnique({
            where: { email: result.data.email }
        })

        if (existing) {
            return {
                message: "Já existe um usuário cadastrado com este e-mail.",
                success: false,
                errors: { email: ["E-mail já cadastrado"] }
            }
        }

        const hashedPassword = await bcrypt.hash(result.data.password, 10);

        await prisma.user.create({
            data: {
                name: result.data.name,
                email: result.data.email,
                password: hashedPassword,
                role: result.data.role as "ADMIN" | "MANAGER" | "USER" | "ENGINEER",
                companyId: result.data.companyId || null,
                canDelete: result.data.canDelete,
                canApprove: result.data.canApprove,
                canManageFinancial: result.data.canManageFinancial,
                canManageHR: result.data.canManageHR,
                canManageSystem: result.data.canManageSystem,
                canViewReports: result.data.canViewReports,
            },
        });

        revalidatePath("/users");
        return { message: "Usuário criado com sucesso!", success: true };
    } catch (error) {
        console.error(error);
        return {
            message: "Erro ao criar usuário no banco de dados.",
            success: false
        };
    }
}

export async function updateUser(
    prevState: UserActionState,
    formData: FormData
) {
    const rawRole = formData.get("role") as string;

    const result = updateUserSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: rawRole,
        companyId: formData.get("companyId") || null,
        canDelete: formData.get("canDelete") === "true",
        canApprove: formData.get("canApprove") === "true",
        canManageFinancial: formData.get("canManageFinancial") === "true",
        canManageHR: formData.get("canManageHR") === "true",
        canManageSystem: formData.get("canManageSystem") === "true",
        canViewReports: formData.get("canViewReports") !== "false",
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
        const existing = await prisma.user.findFirst({
            where: {
                email: result.data.email,
                id: { not: result.data.id }
            }
        })

        if (existing) {
            return {
                message: "Outro usuário já utiliza este e-mail.",
                success: false,
                errors: { email: ["E-mail em uso"] }
            }
        }

        const updateData: Parameters<typeof prisma.user.update>[0]['data'] = {
            name: result.data.name,
            email: result.data.email,
            role: result.data.role as "ADMIN" | "MANAGER" | "USER" | "ENGINEER",
            companyId: result.data.companyId || null,
            canDelete: result.data.canDelete,
            canApprove: result.data.canApprove,
            canManageFinancial: result.data.canManageFinancial,
            canManageHR: result.data.canManageHR,
            canManageSystem: result.data.canManageSystem,
            canViewReports: result.data.canViewReports,
        };

        if (result.data.password && result.data.password.length >= 6) {
            updateData.password = await bcrypt.hash(result.data.password, 10);
        }

        await prisma.user.update({
            where: { id: result.data.id },
            data: updateData,
        });

        revalidatePath("/users");
        return { message: "Usuário atualizado com sucesso!", success: true };
    } catch (error) {
        console.error(error);
        return {
            message: "Erro ao atualizar usuário.",
            success: false
        };
    }
}

export async function deleteUser(id: string) {
    try {
        await prisma.user.delete({
            where: { id }
        })
        revalidatePath("/users")
        return { message: "Usuário removido com sucesso.", success: true }
    } catch (error) {
        console.error(error)
        return { message: "Erro ao remover usuário.", success: false }
    }
}

export async function updateUserPermissions(
    targetUserId: string,
    permissions: Partial<UserPermissions>,
    requestingUserId: string
) {
    // Verificar que quem está fazendo é ADMIN
    const requestingUser = await prisma.user.findUnique({ where: { id: requestingUserId } })
    if (requestingUser?.role !== 'ADMIN') {
        return { success: false, error: 'Apenas ADMIN pode alterar permissões' }
    }

    try {
        await prisma.user.update({
            where: { id: targetUserId },
            data: permissions,
        })

        revalidatePath('/users')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: 'Erro ao atualizar permissões' }
    }
}

export async function getUsers(companyId?: string) {
    try {
        const users = await prisma.user.findMany({
            where: companyId ? { companyId } : undefined,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                companyId: true,
                createdAt: true,
                canDelete: true,
                canApprove: true,
                canManageFinancial: true,
                canManageHR: true,
                canManageSystem: true,
                canViewReports: true,
                company: { select: { id: true, name: true } },
            },
            orderBy: { name: 'asc' },
        })
        return { success: true, data: users }
    } catch (error) {
        console.error(error)
        return { success: false, error: 'Erro ao buscar usuários', data: [] }
    }
}

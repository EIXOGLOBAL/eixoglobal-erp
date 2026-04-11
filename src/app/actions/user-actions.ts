'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { UserPermissions } from "@/lib/permissions"
import { BCRYPT_ROUNDS, validatePassword } from "@/lib/password-policy"
import { assertAuthenticated, assertRole } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

const RoleEnum = z.enum(["ADMIN", "MANAGER", "USER", "ENGINEER"]);

const usernameRule = z.string().min(3, "Usuário deve ter pelo menos 3 caracteres").regex(/^[a-zA-Z0-9._-]+$/, "Usuário pode conter apenas letras, números, pontos, hífens e underscores")

const createUserSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    username: usernameRule,
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
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
    username: usernameRule,
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").optional().or(z.literal("")),
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
        username?: string[];
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
): Promise<UserActionState> {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
    } catch (e) {
        return { message: e instanceof Error ? e.message : "Acesso negado", success: false }
    }

    const rawRole = formData.get("role") as string;

    const result = createUserSchema.safeParse({
        name: formData.get("name"),
        username: formData.get("username"),
        email: formData.get("email") || "",
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
        return {
            errors: result.error.flatten().fieldErrors,
            message: "Campos inválidos. Verifique os erros.",
            success: false
        };
    }

    // Política de senha forte
    const policy = validatePassword(result.data.password)
    if (!policy.valid) {
        return {
            errors: { password: policy.errors },
            message: "Senha não atende à política de segurança.",
            success: false,
        }
    }

    try {
        const existing = await prisma.user.findUnique({
            where: { username: result.data.username }
        })

        if (existing) {
            return {
                message: "Já existe um usuário com este nome de usuário.",
                success: false,
                errors: { username: ["Usuário já cadastrado"] }
            }
        }

        const hashedPassword = await bcrypt.hash(result.data.password, BCRYPT_ROUNDS);

        const created = await prisma.user.create({
            data: {
                name: result.data.name,
                username: result.data.username,
                email: result.data.email || null,
                password: hashedPassword,
                role: result.data.role,
                companyId: result.data.companyId || null,
                canDelete: result.data.canDelete,
                canApprove: result.data.canApprove,
                canManageFinancial: result.data.canManageFinancial,
                canManageHR: result.data.canManageHR,
                canManageSystem: result.data.canManageSystem,
                canViewReports: result.data.canViewReports,
            },
        });

        await logCreate('User', created.id, created.name || 'N/A', result.data)

        revalidatePath("/users");
        return { message: "Usuário criado com sucesso!", success: true };
    } catch (error) {
        console.error("[createUser]", error);
        return {
            message: "Erro ao criar usuário no banco de dados.",
            success: false
        };
    }
}

export async function updateUser(
    prevState: UserActionState,
    formData: FormData
): Promise<UserActionState> {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
    } catch (e) {
        return { message: e instanceof Error ? e.message : "Acesso negado", success: false }
    }

    const rawRole = formData.get("role") as string;

    const result = updateUserSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        username: formData.get("username"),
        email: formData.get("email") || "",
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
        return {
            errors: result.error.flatten().fieldErrors,
            message: "Campos inválidos. Verifique os erros.",
            success: false
        };
    }

    try {
        const existing = await prisma.user.findFirst({
            where: {
                username: result.data.username,
                id: { not: result.data.id }
            }
        })

        if (existing) {
            return {
                message: "Outro usuário já utiliza este nome de usuário.",
                success: false,
                errors: { username: ["Usuário em uso"] }
            }
        }

        const oldUser = await prisma.user.findUnique({ where: { id: result.data.id } })

        const updateData: Parameters<typeof prisma.user.update>[0]['data'] = {
            name: result.data.name,
            username: result.data.username,
            email: result.data.email || null,
            role: result.data.role,
            companyId: result.data.companyId || null,
            canDelete: result.data.canDelete,
            canApprove: result.data.canApprove,
            canManageFinancial: result.data.canManageFinancial,
            canManageHR: result.data.canManageHR,
            canManageSystem: result.data.canManageSystem,
            canViewReports: result.data.canViewReports,
        };

        if (result.data.password && result.data.password.length >= 8) {
            const policy = validatePassword(result.data.password)
            if (!policy.valid) {
                return {
                    errors: { password: policy.errors },
                    message: "Senha não atende à política de segurança.",
                    success: false,
                }
            }
            updateData.password = await bcrypt.hash(result.data.password, BCRYPT_ROUNDS);
        }

        const updated = await prisma.user.update({
            where: { id: result.data.id },
            data: updateData,
        });

        await logUpdate('User', result.data.id, updated.name || 'N/A', oldUser, updated)

        revalidatePath("/users");
        return { message: "Usuário atualizado com sucesso!", success: true };
    } catch (error) {
        console.error("[updateUser]", error);
        return {
            message: "Erro ao atualizar usuário.",
            success: false
        };
    }
}

export async function deleteUser(id: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        // Proteção: não permitir auto-deleção
        if (session.user?.id === id) {
            return { message: "Você não pode deletar sua própria conta.", success: false }
        }

        const oldUser = await prisma.user.findUnique({ where: { id } })

        await prisma.user.delete({ where: { id } })

        await logDelete('User', id, oldUser?.name || 'N/A', oldUser)

        revalidatePath("/users")
        return { message: "Usuário removido com sucesso.", success: true }
    } catch (error) {
        console.error("[deleteUser]", error)
        return {
            message: error instanceof Error ? error.message : "Erro ao remover usuário.",
            success: false,
        }
    }
}

export async function blockUser(userId: string, reason: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        if (session.user?.id === userId) {
            return { success: false, error: "Você não pode bloquear sua própria conta." }
        }

        const blocked = await prisma.user.update({
            where: { id: userId },
            data: { isBlocked: true, blockedAt: new Date(), blockedReason: reason },
        })

        await logAction('BLOCK', 'User', userId, blocked.name || 'N/A', `Motivo: ${reason}`)

        revalidatePath("/users")
        return { success: true, message: "Usuário bloqueado com sucesso." }
    } catch (error) {
        console.error("[blockUser]", error)
        return { success: false, error: error instanceof Error ? error.message : "Erro ao bloquear usuário." }
    }
}

export async function unblockUser(userId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        const unblocked = await prisma.user.update({
            where: { id: userId },
            data: { isBlocked: false, blockedAt: null, blockedReason: null },
        })

        await logAction('UNBLOCK', 'User', userId, unblocked.name || 'N/A')

        revalidatePath("/users")
        return { success: true, message: "Usuário desbloqueado com sucesso." }
    } catch (error) {
        console.error("[unblockUser]", error)
        return { success: false, error: error instanceof Error ? error.message : "Erro ao desbloquear usuário." }
    }
}

export async function deactivateUser(userId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        if (session.user?.id === userId) {
            return { success: false, error: "Você não pode desativar sua própria conta." }
        }

        // Proteger último ADMIN
        const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
        if (target?.role === 'ADMIN') {
            const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: userId } } })
            if (activeAdmins === 0) {
                return { success: false, error: "Não é possível desativar o último administrador ativo." }
            }
        }

        const deactivated = await prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
        })

        await logAction('DEACTIVATE', 'User', userId, deactivated.name || 'N/A')

        revalidatePath("/users")
        return { success: true, message: "Usuário desativado com sucesso." }
    } catch (error) {
        console.error("[deactivateUser]", error)
        return { success: false, error: error instanceof Error ? error.message : "Erro ao desativar usuário." }
    }
}

export async function activateUser(userId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        const activated = await prisma.user.update({
            where: { id: userId },
            data: { isActive: true },
        })

        await logAction('ACTIVATE', 'User', userId, activated.name || 'N/A')

        revalidatePath("/users")
        return { success: true, message: "Usuário ativado com sucesso." }
    } catch (error) {
        console.error("[activateUser]", error)
        return { success: false, error: error instanceof Error ? error.message : "Erro ao ativar usuário." }
    }
}

export async function adminResetPassword(userId: string, newPassword: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        const policy = validatePassword(newPassword)
        if (!policy.valid) {
            return { success: false, error: policy.errors[0] }
        }

        const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
        const resetUser = await prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        })

        await logAction('RESET_PASSWORD', 'User', userId, resetUser.name || 'N/A')

        revalidatePath("/users")
        return { success: true, message: "Senha resetada com sucesso." }
    } catch (error) {
        console.error("[adminResetPassword]", error)
        return { success: false, error: error instanceof Error ? error.message : "Erro ao resetar senha." }
    }
}

export async function updateUserPermissions(
    targetUserId: string,
    permissions: Partial<UserPermissions>,
) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Acesso negado" }
    }

    try {
        const updatedPerms = await prisma.user.update({
            where: { id: targetUserId },
            data: permissions,
        })

        await logAction('UPDATE_PERMISSIONS', 'User', targetUserId, updatedPerms.name || 'N/A', JSON.stringify(permissions))

        revalidatePath('/users')
        return { success: true }
    } catch (error) {
        console.error("[updateUserPermissions]", error)
        return { success: false, error: 'Erro ao atualizar permissões' }
    }
}

export async function getUsers(companyId?: string) {
    try {
        await assertAuthenticated()
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Acesso negado", data: [] }
    }

    try {
        const users = await prisma.user.findMany({
            where: companyId ? { companyId } : undefined,
            select: {
                id: true,
                username: true,
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
        console.error("[getUsers]", error)
        return { success: false, error: 'Erro ao buscar usuários', data: [] }
    }
}

export async function getUserById(id: string) {
    try {
        await assertAuthenticated()
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Acesso negado" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                companyId: true,
                createdAt: true,
                updatedAt: true,
                canDelete: true,
                canApprove: true,
                canManageFinancial: true,
                canManageHR: true,
                canManageSystem: true,
                canViewReports: true,
                company: { select: { id: true, name: true } },
                _count: { select: { projects: true, registeredMeasurements: true, inventoryMovements: true } },
            },
        })
        if (!user) return { success: false, error: 'Usuário não encontrado' }
        return { success: true, data: user }
    } catch (error) {
        console.error("[getUserById]", error)
        return { success: false, error: 'Erro ao buscar usuário' }
    }
}

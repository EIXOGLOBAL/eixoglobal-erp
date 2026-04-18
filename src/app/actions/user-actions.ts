'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { UserPermissions } from "@/lib/permissions"
import { BCRYPT_ROUNDS, validatePassword } from "@/lib/password-policy"
import { assertAuthenticated, assertRole } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'user' })

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
    let session
    try {
        session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
    } catch (e) {
        return { message: e instanceof Error ? e.message : "Acesso negado", success: false }
    }

    const rawRole = formData.get("role") as string;

    // Forçar companyId da sessão — nunca aceitar do frontend
    const safeCompanyId = session.user.companyId

    const result = createUserSchema.safeParse({
        name: formData.get("name"),
        username: formData.get("username"),
        email: formData.get("email") || "",
        password: formData.get("password"),
        role: rawRole,
        companyId: safeCompanyId || null,
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
        log.error({ err: error }, "[createUser]");
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
    let session
    try {
        session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
    } catch (e) {
        return { message: e instanceof Error ? e.message : "Acesso negado", success: false }
    }

    const rawRole = formData.get("role") as string;

    // Forçar companyId da sessão — nunca aceitar do frontend
    const safeCompanyId = session.user.companyId

    const result = updateUserSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        username: formData.get("username"),
        email: formData.get("email") || "",
        password: formData.get("password"),
        role: rawRole,
        companyId: safeCompanyId || null,
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

        // Verificar que o usuário pertence à mesma empresa
        if (!oldUser || oldUser.companyId !== session.user.companyId) {
            return { message: "Acesso negado: usuário pertence a outra empresa.", success: false }
        }

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
        log.error({ err: error }, "[updateUser]");
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
        if (!oldUser) {
            return { message: "Usuário não encontrado.", success: false }
        }

        // Verificar que o usuário pertence à mesma empresa
        if (oldUser.companyId !== session.user.companyId) {
            return { message: "Acesso negado: usuário pertence a outra empresa.", success: false }
        }

        // Verificar dependências antes de deletar
        const [auditCount, notifCount, approvalCount] = await Promise.all([
            prisma.auditLog.count({ where: { userId: id } }),
            prisma.notification.count({ where: { userId: id } }),
            prisma.approvalRequest.count({ where: { requestedById: id } }),
        ])

        if (auditCount > 0 || notifCount > 0 || approvalCount > 0) {
            const deps: string[] = []
            if (auditCount > 0) deps.push(`${auditCount} registro(s) de auditoria`)
            if (notifCount > 0) deps.push(`${notifCount} notificação(ões)`)
            if (approvalCount > 0) deps.push(`${approvalCount} solicitação(ões) de aprovação`)
            return {
                message: `Não é possível excluir: usuário possui ${deps.join(', ')}. Desative o usuário em vez de excluí-lo.`,
                success: false,
            }
        }

        await prisma.user.delete({ where: { id } })

        await logDelete('User', id, oldUser?.name || 'N/A', oldUser)

        revalidatePath("/users")
        return { message: "Usuário removido com sucesso.", success: true }
    } catch (error) {
        log.error({ err: error }, "[deleteUser]")
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

        // Verificar que o usuário pertence à mesma empresa
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
        if (!targetUser || targetUser.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado: usuário pertence a outra empresa." }
        }

        const blocked = await prisma.user.update({
            where: { id: userId },
            data: { isBlocked: true, blockedAt: new Date(), blockedReason: reason },
        })

        await logAction('BLOCK', 'User', userId, blocked.name || 'N/A', `Motivo: ${reason}`)

        revalidatePath("/users")
        return { success: true, message: "Usuário bloqueado com sucesso." }
    } catch (error) {
        log.error({ err: error }, "[blockUser]")
        return { success: false, error: error instanceof Error ? error.message : "Erro ao bloquear usuário." }
    }
}

export async function unblockUser(userId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        // Verificar que o usuário pertence à mesma empresa
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
        if (!targetUser || targetUser.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado: usuário pertence a outra empresa." }
        }

        const unblocked = await prisma.user.update({
            where: { id: userId },
            data: { isBlocked: false, blockedAt: null, blockedReason: null },
        })

        await logAction('UNBLOCK', 'User', userId, unblocked.name || 'N/A')

        revalidatePath("/users")
        return { success: true, message: "Usuário desbloqueado com sucesso." }
    } catch (error) {
        log.error({ err: error }, "[unblockUser]")
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

        // Proteger último ADMIN + verificar empresa
        const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, companyId: true } })
        if (!target || target.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado: usuário pertence a outra empresa." }
        }

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
        log.error({ err: error }, "[deactivateUser]")
        return { success: false, error: error instanceof Error ? error.message : "Erro ao desativar usuário." }
    }
}

export async function activateUser(userId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        // Verificar que o usuário pertence à mesma empresa
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
        if (!targetUser || targetUser.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado: usuário pertence a outra empresa." }
        }

        const activated = await prisma.user.update({
            where: { id: userId },
            data: { isActive: true },
        })

        await logAction('ACTIVATE', 'User', userId, activated.name || 'N/A')

        revalidatePath("/users")
        return { success: true, message: "Usuário ativado com sucesso." }
    } catch (error) {
        log.error({ err: error }, "[activateUser]")
        return { success: false, error: error instanceof Error ? error.message : "Erro ao ativar usuário." }
    }
}

export async function adminResetPassword(userId: string, newPassword: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, "ADMIN")

        // Verificar que o usuário pertence à mesma empresa
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
        if (!targetUser || targetUser.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado: usuário pertence a outra empresa." }
        }

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
        log.error({ err: error }, "[adminResetPassword]")
        return { success: false, error: error instanceof Error ? error.message : "Erro ao resetar senha." }
    }
}

export async function updateUserPermissions(
    targetUserId: string,
    permissions: Partial<UserPermissions>,
) {
    let session
    try {
        session = await assertAuthenticated()
        await assertRole(session, "ADMIN")
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Acesso negado" }
    }

    try {
        // Verificar que o usuário pertence à mesma empresa
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { companyId: true } })
        if (!targetUser || targetUser.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado: usuário pertence a outra empresa." }
        }

        const updatedPerms = await prisma.user.update({
            where: { id: targetUserId },
            data: permissions,
        })

        await logAction('UPDATE_PERMISSIONS', 'User', targetUserId, updatedPerms.name || 'N/A', JSON.stringify(permissions))

        revalidatePath('/users')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "[updateUserPermissions]")
        return { success: false, error: 'Erro ao atualizar permissões' }
    }
}

export async function getUsers(companyId?: string) {
    let session
    try {
        session = await assertAuthenticated()
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Acesso negado", data: [] }
    }

    // Forçar companyId da sessão — nunca aceitar do frontend
    const safeCompanyId = session.user.companyId

    try {
        const users = await prisma.user.findMany({
            where: safeCompanyId ? { companyId: safeCompanyId } : undefined,
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
        log.error({ err: error }, "[getUsers]")
        return { success: false, error: 'Erro ao buscar usuários', data: [] }
    }
}

export async function getUserById(id: string) {
    let session
    try {
        session = await assertAuthenticated()
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

        // Verificar que o usuário pertence à mesma empresa
        if (user.companyId !== session.user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        return { success: true, data: user }
    } catch (error) {
        log.error({ err: error }, "[getUserById]")
        return { success: false, error: 'Erro ao buscar usuário' }
    }
}

'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/session"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { loginRateLimiter } from "@/lib/rate-limit"
import { BCRYPT_ROUNDS, validatePassword } from "@/lib/password-policy"
import { logAudit } from "@/lib/audit-logger"

const loginSchema = z.object({
    username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
    password: z.string().min(1, "Senha obrigatória"),
})

export type LoginState = {
    errors?: {
        username?: string[];
        password?: string[];
    };
    message?: string | null;
    success?: boolean;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
    try {
        const headersList = await headers()
        const ip =
            headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            headersList.get('x-real-ip') ||
            '127.0.0.1'
        const userAgent = headersList.get('user-agent') || 'unknown'
        const ipKey = `login:${ip}`

        // Rate limit
        const rateLimit = loginRateLimiter.check(ipKey)
        if (!rateLimit.success) {
            const resetAtMs = rateLimit.resetAt.getTime()
            const minutesRemaining = Math.ceil((resetAtMs - Date.now()) / 60000)
            return {
                message: `Muitas tentativas de login. Tente novamente em ${minutesRemaining} minuto(s).`,
            }
        }

        const result = loginSchema.safeParse({
            username: formData.get("username"),
            password: formData.get("password"),
        })

        if (!result.success) {
            await logAudit({ action: 'LOGIN_FAILED', reason: 'validation_error', ipAddress: ip, userAgent })
            return {
                errors: result.error.flatten().fieldErrors,
                message: "Dados de login inválidos.",
            }
        }

        const { username, password } = result.data

        const user = await prisma.user.findUnique({ where: { username } })

        if (!user || !user.password) {
            await logAudit({ action: 'LOGIN_FAILED', reason: 'user_not_found', details: username, ipAddress: ip, userAgent })
            return { message: "Credenciais inválidas." }
        }

        if (!user.isActive) {
            await logAudit({ action: 'LOGIN_FAILED', reason: 'account_inactive', details: username, userId: user.id, ipAddress: ip, userAgent })
            return { message: "Conta desativada. Contate o administrador." }
        }

        if (user.isBlocked) {
            await logAudit({ action: 'LOGIN_FAILED', reason: 'account_blocked', details: username, userId: user.id, ipAddress: ip, userAgent })
            return { message: `Conta bloqueada${user.blockedReason ? ': ' + user.blockedReason : ''}. Contate o administrador.` }
        }

        const passwordsMatch = await bcrypt.compare(password, user.password)

        if (!passwordsMatch) {
            await logAudit({ action: 'LOGIN_FAILED', reason: 'invalid_password', details: username, userId: user.id, ipAddress: ip, userAgent })
            return { message: "Credenciais inválidas." }
        }

        // Login OK — atualizar lastLoginAt e buscar permissões
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
        const expires = new Date(Date.now() + SESSION_DURATION_MS)
        const userWithPerms = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true, username: true, email: true, name: true, role: true, companyId: true,
                avatarUrl: true,
                canDelete: true, canApprove: true, canManageFinancial: true,
                canManageHR: true, canManageSystem: true, canViewReports: true,
            }
        })

        const session = await encrypt({ user: userWithPerms, expires })

        const cookieStore = await cookies()
        cookieStore.set("session", session, {
            expires,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        })

        await logAudit({ action: 'LOGIN_SUCCESS', userId: user.id, details: user.username, ipAddress: ip, userAgent })

        return { success: true }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido"
        console.error("[login] error:", error)
        return { message: `Erro no login: ${message}` }
    }
}

export async function logout() {
    try {
        const headersList = await headers()
        const ip =
            headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            headersList.get('x-real-ip') ||
            '127.0.0.1'
        await logAudit({ action: 'LOGOUT', ipAddress: ip })
    } catch {
        // ignore audit failure on logout
    }
    const cookieStore = await cookies()
    cookieStore.delete("session")
    redirect("/login")
}

// DEV ONLY — login automático para desenvolvimento
export async function devLogin(): Promise<{ success: boolean; error?: string }> {
    if (process.env.NODE_ENV !== 'development') {
        return { success: false, error: 'Dev login is only available in development mode' }
    }

    try {
        let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
        if (!user) user = await prisma.user.findFirst()

        if (!user) {
            const hashedPassword = await bcrypt.hash('Dev@123456', BCRYPT_ROUNDS)
            let company = await prisma.company.findFirst()
            if (!company) {
                company = await prisma.company.create({
                    data: {
                        name: 'Eixo Global Engenharia',
                        cnpj: '00000000000000',
                        email: 'dev@eixoglobal.com',
                    }
                })
            }
            user = await prisma.user.create({
                data: {
                    name: 'Admin Dev',
                    username: 'admin',
                    email: 'admin@dev.com',
                    password: hashedPassword,
                    role: 'ADMIN',
                    companyId: company.id,
                }
            })
        }

        const expires = new Date(Date.now() + SESSION_DURATION_MS)
        const userWithPerms = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true, username: true, email: true, name: true, role: true, companyId: true,
                avatarUrl: true,
                canDelete: true, canApprove: true, canManageFinancial: true,
                canManageHR: true, canManageSystem: true, canViewReports: true,
            }
        })
        const session = await encrypt({ user: userWithPerms, expires })

        const cookieStore = await cookies()
        cookieStore.set("session", session, { expires, httpOnly: true, sameSite: 'lax', path: '/' })

        return { success: true }
    } catch (error) {
        console.error("[devLogin]", error)
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
}

export async function checkSetup() {
    const count = await prisma.user.count();
    return count === 0;
}

const registerSchema = z.object({
    name: z.string().min(3),
    username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres").regex(/^[a-zA-Z0-9._-]+$/, "Usuário pode conter apenas letras, números, pontos, hífens e underscores"),
    email: z.string().email().optional().or(z.literal("")),
    password: z.string().min(8),
})

export async function setupAdmin(prevState: { errors?: Record<string, string[]>; message?: string; success?: boolean } | undefined, formData: FormData) {
    const count = await prisma.user.count();
    if (count > 0) {
        return { message: "O sistema já possui usuários cadastrados." }
    }

    const result = registerSchema.safeParse({
        name: formData.get("name"),
        username: formData.get("username"),
        email: formData.get("email") || "",
        password: formData.get("password"),
    })

    if (!result.success) {
        return { errors: result.error.flatten().fieldErrors }
    }

    const policy = validatePassword(result.data.password)
    if (!policy.valid) {
        return { errors: { password: policy.errors }, message: "Senha não atende à política de segurança." }
    }

    const hashedPassword = await bcrypt.hash(result.data.password, BCRYPT_ROUNDS);

    const created = await prisma.user.create({
        data: {
            name: result.data.name,
            username: result.data.username,
            email: result.data.email || null,
            password: hashedPassword,
            role: "ADMIN",
        }
    })

    try {
        await logAudit({ action: 'USER_CREATED_INITIAL_ADMIN', userId: created.id, details: created.username })
    } catch {
        // ignore
    }

    return { success: true }
}

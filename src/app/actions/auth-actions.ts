'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/session"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { loginRateLimiter } from "@/lib/rate-limit"

const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Senha obrigatória"),
})

export type LoginState = {
    errors?: {
        email?: string[];
        password?: string[];
    };
    message?: string | null;
    success?: boolean;
}

export async function login(prevState: LoginState, formData: FormData) {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1'
    const ipKey = `login:${ip}`

    // Check rate limit
    const rateLimit = loginRateLimiter.check(ipKey)
    if (!rateLimit.success) {
        const resetAtMs = rateLimit.resetAt.getTime()
        const nowMs = Date.now()
        const minutesRemaining = Math.ceil((resetAtMs - nowMs) / 60000)
        return {
            message: `Muitas tentativas de login. Tente novamente em ${minutesRemaining} minuto(s).`,
        }
    }

    const result = loginSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    })

    if (!result.success) {
        // Log failed attempt (validation error)
        await logFailedLoginAttempt(ip, 'validation_error', null)
        return {
            errors: result.error.flatten().fieldErrors,
            message: "Dados de login inválidos.",
        }
    }

    const { email, password } = result.data

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user || !user.password) {
            // Log failed attempt (user not found)
            await logFailedLoginAttempt(ip, 'user_not_found', email)
            return {
                message: "Credenciais inválidas.",
            }
        }

        const passwordsMatch = await bcrypt.compare(password, user.password)

        if (!passwordsMatch) {
            // Log failed attempt (wrong password)
            await logFailedLoginAttempt(ip, 'invalid_password', email)
            return {
                message: "Credenciais inválidas.",
            }
        }

        // Login successful
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

        // Buscar user com todos os campos de permissão
        const userWithPerms = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true, email: true, name: true, role: true, companyId: true,
                avatarUrl: true,
                canDelete: true, canApprove: true, canManageFinancial: true,
                canManageHR: true, canManageSystem: true, canViewReports: true,
            }
        })

        const session = await encrypt({
            user: userWithPerms,
            expires
        })

        const cookieStore = await cookies()
        cookieStore.set("session", session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' })

        // Log successful login
        await logSuccessfulLogin(user.id, ip)

        return { success: true }

    } catch (error) {
        console.error("Login error:", error)
        // Log system error
        await logFailedLoginAttempt(ip, 'system_error', null)
        return {
            message: "Erro ao tentar realizar login.",
        }
    }
}

/**
 * Log successful login attempt to audit trail
 */
async function logSuccessfulLogin(userId: string, ipAddress: string) {
    try {
        // If you have an AuditLog table, uncomment and use:
        // await prisma.auditLog.create({
        //     data: {
        //         userId,
        //         action: 'LOGIN_SUCCESS',
        //         ipAddress,
        //         timestamp: new Date(),
        //     }
        // })
        console.log(`[AUDIT] Login successful: user=${userId}, ip=${ipAddress}`)
    } catch (error) {
        console.error('Failed to log successful login:', error)
    }
}

/**
 * Log failed login attempt to audit trail
 */
async function logFailedLoginAttempt(ipAddress: string, reason: string, email: string | null) {
    try {
        // If you have an AuditLog table, uncomment and use:
        // await prisma.auditLog.create({
        //     data: {
        //         action: 'LOGIN_FAILED',
        //         reason,
        //         email,
        //         ipAddress,
        //         timestamp: new Date(),
        //     }
        // })
        console.log(`[AUDIT] Login failed: reason=${reason}, email=${email}, ip=${ipAddress}`)
    } catch (error) {
        console.error('Failed to log failed login:', error)
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete("session")
    redirect("/login")
}

// DEV ONLY - Login automático para desenvolvimento
export async function devLogin(): Promise<{ success: boolean; error?: string }> {
    if (process.env.NODE_ENV !== 'development') {
        return { success: false, error: 'Dev login is only available in development mode' }
    }

    try {
        // Busca o primeiro usuário ADMIN ou cria um admin de desenvolvimento
        let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

        if (!user) {
            user = await prisma.user.findFirst()
        }

        if (!user) {
            // Cria usuário de desenvolvimento
            const hashedPassword = await bcrypt.hash('dev123', 10)

            // Busca ou cria uma empresa
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
                    email: 'admin@dev.com',
                    password: hashedPassword,
                    role: 'ADMIN',
                    companyId: company.id,
                }
            })
        }

        // Cria sessão com permissões
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const userWithPerms = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true, email: true, name: true, role: true, companyId: true,
                avatarUrl: true,
                canDelete: true, canApprove: true, canManageFinancial: true,
                canManageHR: true, canManageSystem: true, canViewReports: true,
            }
        })
        const session = await encrypt({ user: userWithPerms, expires })

        const cookieStore = await cookies()
        cookieStore.set("session", session, { expires, httpOnly: true })

        return { success: true }
    } catch (error) {
        console.error("Dev login error:", error)
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
}

export async function checkSetup() {
    const count = await prisma.user.count();
    return count === 0;
}

const registerSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
})

export async function setupAdmin(prevState: any, formData: FormData) {
    const count = await prisma.user.count();
    if (count > 0) {
        return { message: "O sistema já possui usuários cadastrados." }
    }

    const result = registerSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
    })

    if (!result.success) {
        return { errors: result.error.flatten().fieldErrors }
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    await prisma.user.create({
        data: {
            name: result.data.name,
            email: result.data.email,
            password: hashedPassword,
            role: "ADMIN"
        }
    })

    return { success: true }
}

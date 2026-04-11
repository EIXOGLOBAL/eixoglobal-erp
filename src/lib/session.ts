import { SignJWT, jwtVerify } from 'jose'

let _key: Uint8Array | null = null

function getKey(): Uint8Array {
    if (_key) return _key
    const secretKey = process.env.SESSION_SECRET
    if (!secretKey || secretKey.length < 32) {
        throw new Error(
            'SESSION_SECRET environment variable is missing or too short (minimum 32 chars). ' +
            'Generate one with: openssl rand -hex 64'
        )
    }
    _key = new TextEncoder().encode(secretKey)
    return _key
}

export type SessionPayload = {
    user?: {
        id: string
        username: string
        email?: string | null
        name?: string | null
        role?: string | null
        companyId?: string | null
        avatarUrl?: string | null
        canDelete?: boolean | null
        canApprove?: boolean | null
        canManageFinancial?: boolean | null
        canManageHR?: boolean | null
        canManageSystem?: boolean | null
        canViewReports?: boolean | null
    } | null
    expires?: Date | string
    [key: string]: unknown
}

export async function encrypt(payload: SessionPayload): Promise<string> {
    return await new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(getKey())
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(input, getKey(), {
            algorithms: ['HS256'],
        })
        return payload as SessionPayload
    } catch {
        return null
    }
}

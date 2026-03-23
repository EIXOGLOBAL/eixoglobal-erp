/**
 * CSRF Token Management
 *
 * Para usar em produção, integre com a biblioteca 'csrf':
 * npm install csrf
 *
 * Este é um exemplo simplificado para desenvolvimento.
 */

import crypto from 'crypto'

export class CSRFManager {
    private tokens = new Map<string, { token: string; expiresAt: number }>()

    /**
     * Gera um novo token CSRF
     */
    generateToken(sessionId: string): string {
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 horas

        this.tokens.set(sessionId, { token, expiresAt })
        this.cleanup()

        return token
    }

    /**
     * Valida um token CSRF
     */
    validateToken(sessionId: string, token: string): boolean {
        const storedToken = this.tokens.get(sessionId)

        if (!storedToken) {
            return false
        }

        if (storedToken.expiresAt < Date.now()) {
            this.tokens.delete(sessionId)
            return false
        }

        return crypto.timingSafeEqual(
            Buffer.from(storedToken.token),
            Buffer.from(token)
        )
    }

    /**
     * Remove tokens expirados
     */
    private cleanup() {
        const now = Date.now()
        for (const [sessionId, { expiresAt }] of this.tokens) {
            if (expiresAt < now) {
                this.tokens.delete(sessionId)
            }
        }
    }
}

export const csrfManager = new CSRFManager()

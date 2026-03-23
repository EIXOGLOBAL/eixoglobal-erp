/**
 * Security utility functions for the ERP application
 */

import crypto from 'crypto'

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
    try {
        // In production, use a proper CSRF library like 'csrf' or csrf-sync
        // This is a simple example
        const decoded = Buffer.from(token, 'base64').toString('utf-8')
        return decoded === sessionToken
    } catch {
        return false
    }
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionToken: string): string {
    return Buffer.from(sessionToken).toString('base64')
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
}

/**
 * Check if request is from same origin
 */
export function isSameOrigin(origin: string, host: string): boolean {
    try {
        const originUrl = new URL(origin)
        return originUrl.host === host
    } catch {
        return false
    }
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash sensitive data
 */
export function hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
    score: number
    feedback: string[]
} {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) score += 1
    else feedback.push('Senha deve ter pelo menos 8 caracteres')

    if (password.length >= 12) score += 1

    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Deve conter letras minúsculas')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Deve conter letras maiúsculas')

    if (/[0-9]/.test(password)) score += 1
    else feedback.push('Deve conter números')

    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else feedback.push('Deve conter caracteres especiais')

    return { score, feedback }
}

/**
 * Rate limiting helper - exponential backoff
 */
export function calculateBackoffDelay(attemptNumber: number): number {
    return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000)
}

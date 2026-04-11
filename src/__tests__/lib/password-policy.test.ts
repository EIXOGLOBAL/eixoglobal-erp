import { describe, it, expect } from 'vitest'
import { validatePassword } from '@/lib/password-policy'

describe('Password Policy', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Short1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve ter no mínimo 8 caracteres')
    })

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('lowercase1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos uma letra maiúscula')
    })

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos uma letra minúscula')
    })

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos um número')
    })

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecial1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos um caractere especial')
    })

    it('should accept strong password with all requirements', () => {
      const result = validatePassword('StrongPass123!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', ':', "'", '"', '\\', '|', ',', '.', '<', '>', '/']

      for (const char of specialChars) {
        const result = validatePassword(`TestPass1${char}`)
        expect(result.valid, `Should accept special character: ${char}`).toBe(true)
      }
    })

    it('should return weak strength for passwords with multiple errors', () => {
      const result = validatePassword('weak')
      expect(result.strength).toBe('weak')
    })

    it('should return medium strength for passwords with 1-2 errors', () => {
      const result = validatePassword('NoSpecial1')
      expect(result.strength).toBe('medium')
    })

    it('should return medium strength for valid passwords with 8-11 characters', () => {
      const result = validatePassword('StrongP123!')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('medium')
    })

    it('should return strong strength for passwords with 12+ characters', () => {
      const result = validatePassword('VeryStrongPassword123!')
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
    })

    it('should return all applicable errors', () => {
      const result = validatePassword('weak')
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors).toContain('Senha deve ter no mínimo 8 caracteres')
      expect(result.errors).toContain('Senha deve conter pelo menos uma letra maiúscula')
      expect(result.errors).toContain('Senha deve conter pelo menos um número')
      expect(result.errors).toContain('Senha deve conter pelo menos um caractere especial')
    })

    it('should have no errors for valid strong password', () => {
      const result = validatePassword('VeryStrongPassword123!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject lowercase special variations', () => {
      const result = validatePassword('Test1234')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos um caractere especial')
    })

    it('should accept exactly 8 character valid password', () => {
      const result = validatePassword('TestPass1!')
      expect(result.valid).toBe(true)
    })

    it('should handle whitespace in password', () => {
      const result = validatePassword('Test Pass 123!')
      expect(result.valid).toBe(true)
    })

    it('should provide validation object structure', () => {
      const result = validatePassword('ValidPassword123!')
      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('strength')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })
})

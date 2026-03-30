export interface PasswordValidation {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []

  if (password.length < 8) errors.push('Senha deve ter no mínimo 8 caracteres')
  if (!/[A-Z]/.test(password)) errors.push('Senha deve conter pelo menos uma letra maiúscula')
  if (!/[a-z]/.test(password)) errors.push('Senha deve conter pelo menos uma letra minúscula')
  if (!/[0-9]/.test(password)) errors.push('Senha deve conter pelo menos um número')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Senha deve conter pelo menos um caractere especial')

  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (errors.length === 0) {
    strength = password.length >= 12 ? 'strong' : 'medium'
  } else if (errors.length <= 2) {
    strength = 'medium'
  }

  return { valid: errors.length === 0, errors, strength }
}

export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return '#ef4444'
    case 'medium':
      return '#eab308'
    case 'strong':
      return '#22c55e'
  }
}

export function getPasswordStrengthLabel(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'Fraca'
    case 'medium':
      return 'Média'
    case 'strong':
      return 'Forte'
  }
}

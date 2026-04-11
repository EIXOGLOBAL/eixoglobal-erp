// Zod v4 - Schemas centralizados de validação para o ERP Eixo Global
// Zod já instalado: "zod": "^4.3.6" (package.json)

import { z, type ZodError, type ZodType } from 'zod'

// ============================================================================
// VALIDADORES BASE (reutilizáveis)
// ============================================================================

/**
 * Valida CPF: 11 dígitos numéricos com dígitos verificadores corretos.
 */
export const cpfSchema = z
  .string({ message: 'CPF é obrigatório' })
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 11, {
    message: 'CPF deve conter exatamente 11 dígitos',
  })
  .refine(
    (val) => {
      // Rejeitar sequências repetidas (ex: 111.111.111-11)
      if (/^(\d)\1{10}$/.test(val)) return false

      // Validar primeiro dígito verificador
      let sum = 0
      for (let i = 0; i < 9; i++) {
        sum += parseInt(val[i]) * (10 - i)
      }
      let remainder = (sum * 10) % 11
      if (remainder === 10) remainder = 0
      if (remainder !== parseInt(val[9])) return false

      // Validar segundo dígito verificador
      sum = 0
      for (let i = 0; i < 10; i++) {
        sum += parseInt(val[i]) * (11 - i)
      }
      remainder = (sum * 10) % 11
      if (remainder === 10) remainder = 0
      return remainder === parseInt(val[10])
    },
    { message: 'CPF inválido — dígitos verificadores incorretos' }
  )

/**
 * Valida CNPJ: 14 dígitos numéricos com dígitos verificadores corretos.
 */
export const cnpjSchema = z
  .string({ message: 'CNPJ é obrigatório' })
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 14, {
    message: 'CNPJ deve conter exatamente 14 dígitos',
  })
  .refine(
    (val) => {
      // Rejeitar sequências repetidas
      if (/^(\d)\1{13}$/.test(val)) return false

      const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

      // Primeiro dígito verificador
      let sum = 0
      for (let i = 0; i < 12; i++) {
        sum += parseInt(val[i]) * weights1[i]
      }
      let remainder = sum % 11
      const digit1 = remainder < 2 ? 0 : 11 - remainder
      if (digit1 !== parseInt(val[12])) return false

      // Segundo dígito verificador
      sum = 0
      for (let i = 0; i < 13; i++) {
        sum += parseInt(val[i]) * weights2[i]
      }
      remainder = sum % 11
      const digit2 = remainder < 2 ? 0 : 11 - remainder
      return digit2 === parseInt(val[13])
    },
    { message: 'CNPJ inválido — dígitos verificadores incorretos' }
  )

/**
 * Valida e-mail no formato padrão.
 */
export const emailSchema = z
  .string({ message: 'E-mail é obrigatório' })
  .email({ message: 'Formato de e-mail inválido' })

/**
 * Telefone brasileiro: 10 dígitos (fixo) ou 11 dígitos (celular).
 */
export const phoneSchema = z
  .string({ message: 'Telefone é obrigatório' })
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 10 || val.length === 11, {
    message: 'Telefone deve conter 10 (fixo) ou 11 (celular) dígitos',
  })

/**
 * CEP brasileiro: exatamente 8 dígitos.
 */
export const cepSchema = z
  .string({ message: 'CEP é obrigatório' })
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 8, {
    message: 'CEP deve conter exatamente 8 dígitos',
  })

/**
 * Valor monetário: número positivo com até 2 casas decimais.
 */
export const moneySchema = z
  .number({ message: 'Valor monetário é obrigatório' })
  .positive({ message: 'Valor deve ser maior que zero' })
  .refine((val) => Number(val.toFixed(2)) === val, {
    message: 'Valor monetário deve ter no máximo 2 casas decimais',
  })

/**
 * Data: aceita string ISO ou objeto Date, retorna sempre Date.
 */
export const dateSchema = z
  .union([z.string(), z.date()], {
    message: 'Data é obrigatória',
  })
  .transform((val) => (typeof val === 'string' ? new Date(val) : val))
  .refine((val) => !isNaN(val.getTime()), {
    message: 'Data inválida',
  })

/**
 * UUID v4 válido.
 */
export const uuidSchema = z
  .string({ message: 'ID é obrigatório' })
  .uuid({ message: 'ID deve ser um UUID válido' })

// ============================================================================
// SCHEMAS DE ENTIDADES (correspondentes aos modelos Prisma)
// ============================================================================

/**
 * Client — modelo Prisma: Client
 * Campos baseados no schema do banco e no clientSchema de client-actions.ts
 */
export const clientSchema = z.object({
  type: z
    .enum(['COMPANY', 'INDIVIDUAL'], {
      message: 'Tipo deve ser COMPANY ou INDIVIDUAL',
    })
    .optional()
    .default('COMPANY'),
  companyName: z.string({ message: 'Razão social é obrigatória' }).optional(),
  tradeName: z.string({ message: 'Nome fantasia é obrigatório' }).optional(),
  cnpj: cnpjSchema.optional(),
  personName: z.string({ message: 'Nome da pessoa é obrigatório' }).optional(),
  cpf: cpfSchema.optional(),
  displayName: z
    .string({ message: 'Nome de exibição é obrigatório' })
    .min(2, { message: 'Nome de exibição deve ter no mínimo 2 caracteres' }),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema.optional(),
  mobile: phoneSchema.optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: cepSchema.optional(),
  contactPerson: z.string().optional(),
  contactRole: z.string().optional(),
  notes: z.string().optional(),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'BLOCKED'], {
      message: 'Status deve ser ACTIVE, INACTIVE ou BLOCKED',
    })
    .optional()
    .default('ACTIVE'),
  companyId: uuidSchema,
})

export type ClientFormData = z.infer<typeof clientSchema>

/**
 * Project — modelo Prisma: Project
 */
export const projectSchema = z
  .object({
    name: z
      .string({ message: 'Nome do projeto é obrigatório' })
      .min(3, { message: 'Nome deve ter no mínimo 3 caracteres' }),
    description: z.string().optional(),
    clientId: uuidSchema.optional().nullable(),
    companyId: uuidSchema,
    startDate: z.string({ message: 'Data de início é obrigatória' }).min(1, {
      message: 'Data de início é obrigatória',
    }),
    endDate: z.string().optional(),
    budget: z.number({ message: 'Orçamento deve ser um número' }).optional(),
    status: z
      .enum(
        [
          'PLANNING',
          'IN_PROGRESS',
          'COMPLETED',
          'ON_HOLD',
          'CANCELLED',
          'BIDDING',
          'AWARDED',
          'HANDOVER',
        ],
        { message: 'Status do projeto inválido' }
      )
      .optional()
      .default('PLANNING'),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    address: z.string().optional(),
    location: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    area: z.coerce.number().optional().nullable(),
    engineerId: uuidSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return new Date(data.endDate) >= new Date(data.startDate)
      }
      return true
    },
    {
      message: 'Data de término deve ser igual ou posterior à data de início',
      path: ['endDate'],
    }
  )

export type ProjectFormData = z.infer<typeof projectSchema>

/**
 * Contract — modelo Prisma: Contract
 */
export const contractSchema = z
  .object({
    identifier: z
      .string({ message: 'Identificador é obrigatório' })
      .min(3, { message: 'Identificador deve ter no mínimo 3 caracteres' }),
    contractNumber: z.string().optional().nullable(),
    object: z.string().optional().nullable(),
    description: z.string().optional(),
    value: z
      .number({ message: 'Valor deve ser um número' })
      .min(0, { message: 'Valor não pode ser negativo' })
      .optional(),
    clientId: uuidSchema.optional().nullable(),
    projectId: uuidSchema,
    contractorId: uuidSchema.optional().nullable(),
    startDate: z.string({ message: 'Data de início é obrigatória' }).min(1, {
      message: 'Data de início é obrigatória',
    }),
    endDate: z.string().optional(),
    status: z
      .enum(
        ['ACTIVE', 'COMPLETED', 'CANCELLED', 'DRAFT', 'SUSPENDED', 'PENDING_SIGNATURE'],
        { message: 'Status do contrato inválido' }
      )
      .optional()
      .default('DRAFT'),
    contractType: z
      .enum(['PUBLIC', 'PRIVATE', 'FRAMEWORK', 'OTHER'], {
        message: 'Tipo de contrato inválido',
      })
      .optional()
      .nullable(),
    modalidade: z.string().optional().nullable(),
    warrantyValue: z.number().min(0, { message: 'Valor de garantia não pode ser negativo' }).optional().nullable(),
    warrantyExpiry: z.string().optional().nullable(),
    executionDeadline: z.number().optional().nullable(),
    reajusteIndex: z
      .enum(['INCC', 'IPCA', 'IGP_M', 'CUSTOM'], {
        message: 'Índice de reajuste inválido',
      })
      .optional()
      .nullable(),
    reajusteBaseDate: z.string().optional().nullable(),
    fiscalName: z.string().optional().nullable(),
    witnessNames: z.string().optional().nullable(),
    paymentTerms: z.string().optional().nullable(),
    retentionPercent: z
      .number()
      .min(0, { message: 'Percentual de retenção não pode ser negativo' })
      .max(100, { message: 'Percentual de retenção não pode exceder 100%' })
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return new Date(data.endDate) >= new Date(data.startDate)
      }
      return true
    },
    {
      message: 'Data de término deve ser igual ou posterior à data de início',
      path: ['endDate'],
    }
  )

export type ContractFormData = z.infer<typeof contractSchema>

/**
 * FinancialRecord — modelo Prisma: FinancialRecord
 */
export const financialRecordSchema = z.object({
  description: z
    .string({ message: 'Descrição é obrigatória' })
    .min(3, { message: 'Descrição deve ter no mínimo 3 caracteres' }),
  amount: z
    .number({ message: 'Valor é obrigatório' })
    .min(0.01, { message: 'Valor deve ser maior que zero' }),
  type: z.enum(['INCOME', 'EXPENSE'], {
    message: 'Tipo deve ser INCOME (receita) ou EXPENSE (despesa)',
  }),
  status: z
    .enum(['PENDING', 'PAID', 'CANCELLED', 'SCHEDULED'], {
      message: 'Status financeiro inválido',
    })
    .optional()
    .default('PENDING'),
  dueDate: z.string({ message: 'Data de vencimento é obrigatória' }).min(1, {
    message: 'Data de vencimento é obrigatória',
  }),
  paidDate: z.string().optional().nullable(),
  paidAmount: z
    .number()
    .min(0, { message: 'Valor pago não pode ser negativo' })
    .optional(),
  bankAccountId: uuidSchema.optional().nullable(),
  category: z.string().optional().nullable(),
  companyId: uuidSchema,
  projectId: uuidSchema.optional().nullable(),
  costCenterId: uuidSchema.optional().nullable(),
})

export type FinancialRecordFormData = z.infer<typeof financialRecordSchema>

/**
 * User — modelo Prisma: User
 */
export const userSchema = z.object({
  name: z
    .string({ message: 'Nome é obrigatório' })
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  username: z
    .string({ message: 'Usuário é obrigatório' })
    .min(3, { message: 'Usuário deve ter pelo menos 3 caracteres' })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message:
        'Usuário pode conter apenas letras, números, pontos, hífens e underscores',
    }),
  email: emailSchema.optional().or(z.literal('')),
  password: z
    .string({ message: 'Senha é obrigatória' })
    .min(8, { message: 'Senha deve ter pelo menos 8 caracteres' }),
  role: z.enum(
    ['ADMIN', 'MANAGER', 'USER', 'ENGINEER', 'SUPERVISOR', 'SAFETY_OFFICER', 'ACCOUNTANT', 'HR_ANALYST'],
    { message: 'Perfil de acesso inválido' }
  ),
  companyId: uuidSchema.optional().nullable(),
  canDelete: z.boolean().optional().default(false),
  canApprove: z.boolean().optional().default(false),
  canManageFinancial: z.boolean().optional().default(false),
  canManageHR: z.boolean().optional().default(false),
  canManageSystem: z.boolean().optional().default(false),
  canViewReports: z.boolean().optional().default(true),
})

export type UserFormData = z.infer<typeof userSchema>

/**
 * Equipment — modelo Prisma: Equipment
 */
export const equipmentSchema = z.object({
  name: z
    .string({ message: 'Nome do equipamento é obrigatório' })
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  code: z
    .string({ message: 'Código é obrigatório' })
    .min(1, { message: 'Código é obrigatório' }),
  type: z.enum(
    [
      'VEHICLE',
      'CRANE',
      'EXCAVATOR',
      'CONCRETE_MIXER',
      'COMPRESSOR',
      'GENERATOR',
      'SCAFFOLD',
      'FORMWORK',
      'PUMP',
      'TOOL',
      'OTHER',
    ],
    { message: 'Tipo de equipamento inválido' }
  ),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  year: z.number().int({ message: 'Ano deve ser um número inteiro' }).optional().nullable(),
  status: z
    .enum(
      ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE', 'RENTED_OUT', 'RESERVED', 'CONDEMNED'],
      { message: 'Status do equipamento inválido' }
    )
    .optional()
    .default('AVAILABLE'),
  costPerHour: z
    .number()
    .min(0, { message: 'Custo por hora não pode ser negativo' })
    .optional()
    .nullable(),
  costPerDay: z
    .number()
    .min(0, { message: 'Custo por dia não pode ser negativo' })
    .optional()
    .nullable(),
  isOwned: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
})

export type EquipmentFormData = z.infer<typeof equipmentSchema>

/**
 * TimeEntry — modelo Prisma: TimeEntry
 */
export const timeEntrySchema = z.object({
  employeeId: z
    .string({ message: 'Funcionário é obrigatório' })
    .uuid({ message: 'ID do funcionário inválido' }),
  companyId: uuidSchema,
  date: z.string({ message: 'Data é obrigatória' }).min(1, {
    message: 'Data é obrigatória',
  }),
  clockIn: z.string({ message: 'Horário de entrada é obrigatório' }).min(1, {
    message: 'Horário de entrada é obrigatório',
  }),
  clockOut: z.string().optional().nullable(),
  breakStart: z.string().optional().nullable(),
  breakEnd: z.string().optional().nullable(),
  totalHours: z
    .number()
    .min(0, { message: 'Total de horas não pode ser negativo' })
    .optional()
    .nullable(),
  overtimeHours: z
    .number()
    .min(0, { message: 'Horas extras não podem ser negativas' })
    .optional()
    .nullable(),
  projectId: uuidSchema.optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED', 'ADJUSTED'], {
      message: 'Status do ponto inválido',
    })
    .optional()
    .default('PENDING'),
  notes: z.string().optional().nullable(),
})

export type TimeEntryFormData = z.infer<typeof timeEntrySchema>

/**
 * SafetyIncident — modelo Prisma: SafetyIncident
 */
export const incidentSchema = z.object({
  description: z
    .string({ message: 'Descrição é obrigatória' })
    .min(1, { message: 'Descrição é obrigatória' }),
  type: z.enum(
    [
      'ACCIDENT',
      'NEAR_MISS',
      'UNSAFE_CONDITION',
      'UNSAFE_ACT',
      'ENVIRONMENTAL',
      'FIRST_AID',
      'PPE_VIOLATION',
    ],
    { message: 'Tipo de incidente inválido' }
  ),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], {
    message: 'Severidade deve ser CRITICAL, HIGH, MEDIUM ou LOW',
  }),
  projectId: uuidSchema,
  companyId: uuidSchema,
  location: z.string().optional().nullable(),
  date: z.string({ message: 'Data do incidente é obrigatória' }).min(1, {
    message: 'Data do incidente é obrigatória',
  }),
  reportedById: uuidSchema,
  injuredEmployeeId: uuidSchema.optional().nullable(),
  rootCause: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  preventiveAction: z.string().optional().nullable(),
  status: z
    .enum(['OPEN', 'CLOSED'], { message: 'Status deve ser OPEN ou CLOSED' })
    .optional()
    .default('OPEN'),
  witnesses: z.array(z.string()).optional(),
  daysLost: z
    .number()
    .int({ message: 'Dias perdidos deve ser um número inteiro' })
    .min(0, { message: 'Dias perdidos não pode ser negativo' })
    .optional()
    .default(0),
})

export type IncidentFormData = z.infer<typeof incidentSchema>

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Valida dados contra um schema Zod e retorna resultado tipado.
 *
 * @example
 * const result = validateWithSchema(clientSchema, formData)
 * if (result.success) {
 *   // result.data é do tipo ClientFormData
 * } else {
 *   // result.errors é ZodError
 * }
 */
export function validateWithSchema<T>(
  schema: ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Converte ZodError em um mapa de mensagens por campo (primeira mensagem de cada campo).
 * Mensagens já vêm em PT-BR conforme definido nos schemas acima.
 *
 * @example
 * const messages = getErrorMessages(zodError)
 * // { displayName: "Nome de exibição deve ter no mínimo 2 caracteres", email: "Formato de e-mail inválido" }
 */
export function getErrorMessages(zodError: ZodError): Record<string, string> {
  const messages: Record<string, string> = {}

  for (const issue of zodError.issues) {
    const field = issue.path.join('.')
    // Só mantém a primeira mensagem de cada campo
    if (field && !messages[field]) {
      messages[field] = issue.message
    }
  }

  return messages
}

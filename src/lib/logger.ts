import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Logger estruturado usando Pino.
 *
 * - Produção: JSON para stdout (compatível com Docker / log aggregators)
 * - Dev: log colorido legível via pino-pretty (quando disponível)
 *
 * Uso básico:
 *   import { logger } from '@/lib/logger'
 *   const log = logger.child({ module: 'financial' })
 *   log.error({ err }, 'Erro ao criar lançamento')
 */
export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        },
        formatters: {
          level(label: string) {
            return { level: label }
          },
        },
      }
    : {
        formatters: {
          level(label: string) {
            return { level: label }
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
})

export default logger

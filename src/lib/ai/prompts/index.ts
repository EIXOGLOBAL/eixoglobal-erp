/**
 * Seleciona o system prompt correto baseado no pathname do modulo.
 */

import { SYSTEM_GLOBAL } from './system-global'
import { SYSTEM_FINANCEIRO } from './system-financeiro'
import { SYSTEM_ENGENHARIA } from './system-engenharia'
import { SYSTEM_RH } from './system-rh'
import { SYSTEM_SUPRIMENTOS } from './system-suprimentos'

/** Mapeamento de prefixos de rota → system prompt */
const MODULE_PROMPTS: Record<string, string> = {
  '/financeiro': SYSTEM_FINANCEIRO,
  '/orcamentos': SYSTEM_FINANCEIRO,
  '/projects': SYSTEM_ENGENHARIA,
  '/contratos': SYSTEM_ENGENHARIA,
  '/measurements': SYSTEM_ENGENHARIA,
  '/medicoes': SYSTEM_ENGENHARIA,
  '/rdo': SYSTEM_ENGENHARIA,
  '/qualidade': SYSTEM_ENGENHARIA,
  '/seguranca-trabalho': SYSTEM_ENGENHARIA,
  '/rh': SYSTEM_RH,
  '/dep-pessoal': SYSTEM_RH,
  '/ponto': SYSTEM_RH,
  '/estoque': SYSTEM_SUPRIMENTOS,
  '/compras': SYSTEM_SUPRIMENTOS,
  '/equipamentos': SYSTEM_SUPRIMENTOS,
}

/**
 * Retorna o system prompt mais adequado para o modulo indicado pela URL.
 */
export function getSystemPromptForModule(pathname: string): string {
  for (const [prefix, prompt] of Object.entries(MODULE_PROMPTS)) {
    if (pathname.startsWith(prefix)) {
      return prompt
    }
  }
  return SYSTEM_GLOBAL
}

export { SYSTEM_GLOBAL, SYSTEM_FINANCEIRO, SYSTEM_ENGENHARIA, SYSTEM_RH, SYSTEM_SUPRIMENTOS }

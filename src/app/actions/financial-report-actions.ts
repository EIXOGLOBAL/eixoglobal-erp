'use server'

import { getSession } from '@/lib/auth'
import {
  generateDRE,
  generateCashflowProjection,
  generateCostCenterReport,
  getFinancialKPIs,
} from '@/lib/financial-reports'
import type {
  DREReport,
  CashflowProjection,
  CostCenterReport,
  FinancialKPIs,
} from '@/lib/financial-reports'

export async function getDREReport(
  year: number,
  month?: number
): Promise<{ success: boolean; data?: DREReport; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await generateDRE(session.user.companyId, year, month)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao gerar DRE:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar DRE',
    }
  }
}

export async function getCashflowProjectionData(
  months: number
): Promise<{ success: boolean; data?: CashflowProjection; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await generateCashflowProjection(session.user.companyId, months)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao gerar projeção de fluxo de caixa:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar projeção',
    }
  }
}

export async function getCostCenterReportData(
  year: number
): Promise<{ success: boolean; data?: CostCenterReport; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await generateCostCenterReport(session.user.companyId, year)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao gerar relatório de centros de custo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar relatório',
    }
  }
}

export async function getFinancialKPIsData(): Promise<{
  success: boolean
  data?: FinancialKPIs
  error?: string
}> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await getFinancialKPIs(session.user.companyId)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao obter KPIs financeiros:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao obter KPIs',
    }
  }
}

/**
 * WhatsApp Message Templates — PT-BR
 *
 * Templates de mensagens para envio via WhatsApp.
 * Cada funcao recebe parametros tipados e retorna o texto formatado.
 */

// ============================================================================
// COBRANCA
// ============================================================================

/**
 * Lembrete de cobranca para cliente inadimplente.
 */
export function overdueReminder(params: {
  clientName: string
  amount: string
  dueDate: string
}): string {
  return [
    `Prezado(a) ${params.clientName},`,
    '',
    `Identificamos que o valor de R$ ${params.amount} com vencimento em ${params.dueDate} encontra-se em aberto.`,
    '',
    'Caso o pagamento ja tenha sido efetuado, por favor desconsidere esta mensagem.',
    '',
    'Para mais informacoes ou negociacao, entre em contato conosco.',
    '',
    'Atenciosamente,',
    'Eixo Global',
  ].join('\n')
}

// ============================================================================
// CONFIRMACAO DE PAGAMENTO
// ============================================================================

/**
 * Confirmacao de recebimento de pagamento.
 */
export function paymentConfirmation(params: {
  clientName: string
  amount: string
  invoiceNumber: string
}): string {
  return [
    `Prezado(a) ${params.clientName},`,
    '',
    `Confirmamos o recebimento do pagamento no valor de R$ ${params.amount}, referente ao documento ${params.invoiceNumber}.`,
    '',
    'Agradecemos pela pontualidade!',
    '',
    'Atenciosamente,',
    'Eixo Global',
  ].join('\n')
}

// ============================================================================
// ALERTA DO SISTEMA
// ============================================================================

/**
 * Alerta do sistema para administradores.
 */
export function systemAlert(params: {
  adminName: string
  alertType: string
  details: string
}): string {
  return [
    `Ola ${params.adminName},`,
    '',
    `[ALERTA] ${params.alertType}`,
    '',
    params.details,
    '',
    'Acesse o painel administrativo do ERP para mais detalhes.',
  ].join('\n')
}

// ============================================================================
// COBRANCA VIA REGISTRO DE INADIMPLENCIA
// ============================================================================

/**
 * Mensagem de cobranca enviada pelo modulo de inadimplencia.
 */
export function collectionNotice(params: {
  description: string
  amount: string
  dueDate: string
  daysOverdue: string
}): string {
  return [
    'Prezado(a) cliente,',
    '',
    `Informamos que o titulo "${params.description}" no valor de R$ ${params.amount}, vencido em ${params.dueDate} (${params.daysOverdue} dias em atraso), encontra-se pendente de pagamento.`,
    '',
    'Solicitamos a regularizacao o mais breve possivel.',
    '',
    'Para negociar condicoes de pagamento, entre em contato conosco.',
    '',
    'Atenciosamente,',
    'Eixo Global - Financeiro',
  ].join('\n')
}

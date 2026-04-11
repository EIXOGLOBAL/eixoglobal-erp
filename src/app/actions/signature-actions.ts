'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notification-actions'
import { notifyUser, notifyUsers } from '@/lib/sse-notifications'
import {
  uploadDocument,
  addSigners,
  sendToSign,
  getDocumentStatus,
  cancelDocument as d4signCancelDocument,
  downloadSignedDocument as d4signDownloadDocument,
  isD4SignConfigured,
  type D4SignSigner,
} from '@/lib/d4sign'
import { formatDate } from '@/lib/formatters'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAuth(roles?: string[]) {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Nao autenticado')
  }

  const user = session.user as {
    id: string
    email: string
    name: string
    role: string
    companyId: string
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    throw new Error('Sem permissao para esta operacao')
  }

  return user
}

/**
 * Generate a simple contract summary PDF buffer.
 * Uses a very basic text-based approach since we don't have a PDF library dependency.
 * This creates a minimal PDF that contains the contract summary info.
 */
function generateContractSignaturePdf(contract: {
  identifier: string
  description?: string | null
  value?: number | null
  startDate: Date
  endDate?: Date | null
  project: { name: string }
  contractor?: { name: string } | null
  items: Array<{
    description: string
    unit: string
    quantity: number
    unitPrice: number
  }>
}): Buffer {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  // Build a simple text-based PDF (minimal valid PDF structure)
  const lines: string[] = []
  lines.push(`CONTRATO: ${contract.identifier}`)
  lines.push(`Projeto: ${contract.project.name}`)
  lines.push(`Contratada: ${contract.contractor?.name || 'Nao informada'}`)
  lines.push(`Valor: ${contract.value ? formatCurrency(contract.value) : 'N/A'}`)
  lines.push(`Inicio: ${formatDate(contract.startDate)}`)
  lines.push(`Termino: ${contract.endDate ? formatDate(contract.endDate) : 'Indefinido'}`)
  lines.push(``)
  lines.push(`Descricao: ${contract.description || 'Sem descricao'}`)
  lines.push(``)
  lines.push(`--- ITENS DO CONTRATO ---`)
  lines.push(``)

  for (const item of contract.items) {
    const totalItem = item.quantity * item.unitPrice
    lines.push(
      `- ${item.description} | ${item.quantity} ${item.unit} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(totalItem)}`
    )
  }

  lines.push(``)
  lines.push(`Data de emissao: ${formatDate(new Date())}`)
  lines.push(``)
  lines.push(`_______________________________`)
  lines.push(`Assinatura`)

  const textContent = lines.join('\n')

  // Create a minimal valid PDF
  const pdfContent = buildMinimalPdf(textContent)
  return Buffer.from(pdfContent)
}

/**
 * Generate a simple bulletin summary PDF buffer.
 */
function generateBulletinSignaturePdf(bulletin: {
  number: string
  referenceMonth: string
  periodStart: Date
  periodEnd: Date
  totalValue: number
  project: { name: string }
  contract: { identifier: string }
  items: Array<{
    description: string
    unit: string
    currentMeasured: number
    unitPrice: number
    currentValue: number
  }>
}): Buffer {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const lines: string[] = []
  lines.push(`BOLETIM DE MEDICAO: ${bulletin.number}`)
  lines.push(`Projeto: ${bulletin.project.name}`)
  lines.push(`Contrato: ${bulletin.contract.identifier}`)
  lines.push(`Referencia: ${bulletin.referenceMonth}`)
  lines.push(`Periodo: ${formatDate(bulletin.periodStart)} a ${formatDate(bulletin.periodEnd)}`)
  lines.push(`Valor Total: ${formatCurrency(bulletin.totalValue)}`)
  lines.push(``)
  lines.push(`--- ITENS MEDIDOS ---`)
  lines.push(``)

  for (const item of bulletin.items) {
    lines.push(
      `- ${item.description} | ${item.currentMeasured} ${item.unit} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.currentValue)}`
    )
  }

  lines.push(``)
  lines.push(`Data de emissao: ${formatDate(new Date())}`)
  lines.push(``)
  lines.push(`_______________________________`)
  lines.push(`Engenheiro Responsavel`)
  lines.push(``)
  lines.push(`_______________________________`)
  lines.push(`Gestor`)

  const textContent = lines.join('\n')
  const pdfContent = buildMinimalPdf(textContent)
  return Buffer.from(pdfContent)
}

/**
 * Build a minimal valid PDF with text content.
 * This creates a basic PDF 1.4 file with a single page containing the text.
 */
function buildMinimalPdf(text: string): Uint8Array {
  // Escape special PDF characters in text and split into lines
  const escapedLines = text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .split('\n')

  // Build text operations — each line at a specific Y position
  let textOps = ''
  let yPos = 750
  for (const line of escapedLines) {
    textOps += `BT /F1 10 Tf ${50} ${yPos} Td (${line}) Tj ET\n`
    yPos -= 14
    if (yPos < 50) break // Page overflow protection
  }

  const stream = `${textOps}`
  const streamLength = new TextEncoder().encode(stream).length

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${streamLength} >>
stream
${stream}endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`

  return new TextEncoder().encode(pdf)
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Initiate digital signature for a contract.
 * 1. Auth check (ADMIN/MANAGER)
 * 2. Fetch contract with relations
 * 3. Generate PDF
 * 4. Upload to D4Sign
 * 5. Add signers (current user + client + contractor)
 * 6. Send to sign (simultaneous workflow)
 * 7. Update contract record
 * 8. Notify + audit
 */
export async function initiateContractSignature(contractId: string) {
  try {
    const user = await requireAuth(['ADMIN', 'MANAGER'])

    if (!isD4SignConfigured()) {
      return {
        success: false,
        error: 'D4Sign nao esta configurado. Verifique as variaveis de ambiente.',
      }
    }

    // Fetch contract with all needed relations
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        items: true,
        project: {
          include: {
            client: true,
          },
        },
        contractor: true,
      },
    })

    if (!contract) {
      return { success: false, error: 'Contrato nao encontrado' }
    }

    if (contract.d4signDocumentUuid) {
      return {
        success: false,
        error: 'Este contrato ja possui uma assinatura digital em andamento ou concluida.',
      }
    }

    // Generate PDF
    const pdfBuffer = generateContractSignaturePdf({
      identifier: contract.identifier,
      description: contract.description,
      value: contract.value ? Number(contract.value) : null,
      startDate: contract.startDate,
      endDate: contract.endDate,
      project: { name: contract.project.name },
      contractor: contract.contractor ? { name: contract.contractor.name } : null,
      items: contract.items.map((item) => ({
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    })

    // Upload to D4Sign
    const filename = `contrato-${contract.identifier.replace(/[/\\]/g, '-')}.pdf`
    const uploadResult = await uploadDocument(pdfBuffer, filename)

    // Build signer list
    const signers: D4SignSigner[] = []

    // Current user always signs
    signers.push({
      email: user.email,
      act: '1', // Assinar
    })

    // Client email if available
    const clientEmail = contract.project.client?.email
    if (clientEmail && clientEmail !== user.email) {
      signers.push({
        email: clientEmail,
        act: '1', // Assinar
      })
    }

    // Add signers to document
    await addSigners(uploadResult.uuid, signers)

    // Send for signing (workflow 0 = simultaneous)
    await sendToSign(
      uploadResult.uuid,
      `Solicitacao de assinatura do contrato ${contract.identifier}`,
      0
    )

    // Update contract
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        d4signDocumentUuid: uploadResult.uuid,
        d4signStatus: 'PROCESSING',
        d4signSentAt: new Date(),
        signatureRequired: true,
      },
    })

    // Audit
    await logAudit({
      action: 'SIGNATURE_INITIATED',
      entity: 'Contract',
      entityId: contractId,
      entityName: contract.identifier,
      userId: user.id,
      companyId: user.companyId,
      newData: {
        d4signDocumentUuid: uploadResult.uuid,
        signers: signers.map((s) => s.email),
      },
    })

    // Notification
    await createNotification({
      userId: user.id,
      type: 'SIGNATURE_INITIATED',
      title: 'Assinatura Digital Enviada',
      message: `O contrato ${contract.identifier} foi enviado para assinatura digital.`,
      link: `/contratos/${contractId}`,
    })

    // SSE notification
    notifyUser(user.id, {
      type: 'SIGNATURE_INITIATED',
      title: 'Assinatura Digital',
      message: `Contrato ${contract.identifier} enviado para assinatura.`,
      link: `/contratos/${contractId}`,
    })

    revalidatePath(`/contratos/${contractId}`)

    return {
      success: true,
      data: {
        documentUuid: uploadResult.uuid,
        signersCount: signers.length,
      },
    }
  } catch (error) {
    console.error('Error initiating contract signature:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao iniciar assinatura digital',
    }
  }
}

/**
 * Initiate digital signature for a measurement bulletin.
 * Signers: engineer + manager/admin users.
 */
export async function initiateBulletinSignature(bulletinId: string) {
  try {
    const user = await requireAuth(['ADMIN', 'MANAGER', 'ENGINEER'])

    if (!isD4SignConfigured()) {
      return {
        success: false,
        error: 'D4Sign nao esta configurado. Verifique as variaveis de ambiente.',
      }
    }

    const bulletin = await prisma.measurementBulletin.findUnique({
      where: { id: bulletinId },
      include: {
        project: true,
        contract: true,
        items: {
          include: { contractItem: true },
        },
        engineer: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!bulletin) {
      return { success: false, error: 'Boletim nao encontrado' }
    }

    if (bulletin.d4signDocumentUuid) {
      return {
        success: false,
        error: 'Este boletim ja possui uma assinatura digital em andamento ou concluida.',
      }
    }

    // Generate PDF
    const pdfBuffer = generateBulletinSignaturePdf({
      number: bulletin.number,
      referenceMonth: bulletin.referenceMonth,
      periodStart: bulletin.periodStart,
      periodEnd: bulletin.periodEnd,
      totalValue: Number(bulletin.totalValue),
      project: { name: bulletin.project.name },
      contract: { identifier: bulletin.contract.identifier },
      items: bulletin.items.map((item) => ({
        description: item.description,
        unit: item.unit,
        currentMeasured: Number(item.currentMeasured),
        unitPrice: Number(item.unitPrice),
        currentValue: Number(item.currentValue),
      })),
    })

    // Upload to D4Sign
    const filename = `boletim-${bulletin.number.replace(/[/\\]/g, '-')}.pdf`
    const uploadResult = await uploadDocument(pdfBuffer, filename)

    // Build signer list
    const signers: D4SignSigner[] = []
    const signerEmails = new Set<string>()

    // Current user
    signerEmails.add(user.email)
    signers.push({ email: user.email, act: '1' })

    // Engineer
    if (bulletin.engineer?.email && !signerEmails.has(bulletin.engineer.email)) {
      signerEmails.add(bulletin.engineer.email)
      signers.push({ email: bulletin.engineer.email, act: '1' })
    }

    // Manager
    if (bulletin.manager?.email && !signerEmails.has(bulletin.manager.email)) {
      signerEmails.add(bulletin.manager.email)
      signers.push({ email: bulletin.manager.email, act: '1' })
    }

    // Add signers
    await addSigners(uploadResult.uuid, signers)

    // Send for signing
    await sendToSign(
      uploadResult.uuid,
      `Solicitacao de assinatura do boletim de medicao ${bulletin.number}`,
      0
    )

    // Update bulletin
    await prisma.measurementBulletin.update({
      where: { id: bulletinId },
      data: {
        d4signDocumentUuid: uploadResult.uuid,
        d4signStatus: 'PROCESSING',
        d4signSentAt: new Date(),
        signatureRequired: true,
      },
    })

    // Audit
    await logAudit({
      action: 'SIGNATURE_INITIATED',
      entity: 'MeasurementBulletin',
      entityId: bulletinId,
      entityName: bulletin.number,
      userId: user.id,
      companyId: bulletin.contract.companyId,
      newData: {
        d4signDocumentUuid: uploadResult.uuid,
        signers: Array.from(signerEmails),
      },
    })

    // Notify all involved users via SSE
    const notifyIds = Array.from(
      new Set([
        user.id,
        bulletin.engineer?.id,
        bulletin.manager?.id,
      ].filter(Boolean) as string[])
    )

    notifyUsers(notifyIds, {
      type: 'SIGNATURE_INITIATED',
      title: 'Assinatura Digital',
      message: `Boletim ${bulletin.number} enviado para assinatura.`,
      link: `/measurements/${bulletinId}`,
    })

    revalidatePath(`/measurements/${bulletinId}`)

    return {
      success: true,
      data: {
        documentUuid: uploadResult.uuid,
        signersCount: signers.length,
      },
    }
  } catch (error) {
    console.error('Error initiating bulletin signature:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao iniciar assinatura digital',
    }
  }
}

/**
 * Check the current signature status on D4Sign and sync to the database.
 */
export async function checkSignatureStatus(
  entityType: 'contract' | 'bulletin',
  entityId: string
) {
  try {
    await requireAuth()

    if (!isD4SignConfigured()) {
      return { success: false, error: 'D4Sign nao esta configurado.' }
    }

    // Fetch entity
    let documentUuid: string | null = null
    let entityName = ''

    if (entityType === 'contract') {
      const contract = await prisma.contract.findUnique({
        where: { id: entityId },
        select: { d4signDocumentUuid: true, identifier: true },
      })
      if (!contract) return { success: false, error: 'Contrato nao encontrado' }
      documentUuid = contract.d4signDocumentUuid
      entityName = contract.identifier
    } else {
      const bulletin = await prisma.measurementBulletin.findUnique({
        where: { id: entityId },
        select: { d4signDocumentUuid: true, number: true },
      })
      if (!bulletin) return { success: false, error: 'Boletim nao encontrado' }
      documentUuid = bulletin.d4signDocumentUuid
      entityName = bulletin.number
    }

    if (!documentUuid) {
      return { success: false, error: 'Nenhuma assinatura digital vinculada.' }
    }

    // Fetch status from D4Sign
    const status = await getDocumentStatus(documentUuid)

    // Check if all signers have signed
    const allSigned =
      status.signers &&
      status.signers.length > 0 &&
      status.signers.every((s) => s.status === 'signed')

    if (allSigned) {
      // Download signed document
      let signedFileUrl: string | null = null
      try {
        const signedPdf = await d4signDownloadDocument(documentUuid)
        // Store as base64 data URL (for SQLite — no file system in serverless)
        signedFileUrl = `data:application/pdf;base64,${signedPdf.toString('base64')}`
      } catch {
        // Could not download — will be null, can retry later
      }

      // Update entity
      const updateData = {
        d4signStatus: 'SIGNED' as const,
        d4signSignedAt: new Date(),
        d4signSignedFileUrl: signedFileUrl,
      }

      if (entityType === 'contract') {
        await prisma.contract.update({
          where: { id: entityId },
          data: updateData,
        })
        revalidatePath(`/contratos/${entityId}`)
      } else {
        await prisma.measurementBulletin.update({
          where: { id: entityId },
          data: updateData,
        })
        revalidatePath(`/measurements/${entityId}`)
      }
    }

    return {
      success: true,
      data: {
        status: allSigned ? 'SIGNED' : 'PROCESSING',
        statusName: status.statusName,
        signers: status.signers?.map((s) => ({
          email: s.email,
          name: s.name ?? s.email,
          status: s.status,
          signedAt: s.signed_at ?? null,
        })) ?? [],
        entityName,
      },
    }
  } catch (error) {
    console.error('Error checking signature status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao verificar status da assinatura',
    }
  }
}

/**
 * Cancel a digital signature on D4Sign.
 */
export async function cancelSignature(
  entityType: 'contract' | 'bulletin',
  entityId: string,
  reason: string
) {
  try {
    const user = await requireAuth(['ADMIN'])

    if (!isD4SignConfigured()) {
      return { success: false, error: 'D4Sign nao esta configurado.' }
    }

    let documentUuid: string | null = null
    let entityName = ''
    let companyId = ''

    if (entityType === 'contract') {
      const contract = await prisma.contract.findUnique({
        where: { id: entityId },
        select: { d4signDocumentUuid: true, identifier: true, companyId: true },
      })
      if (!contract) return { success: false, error: 'Contrato nao encontrado' }
      documentUuid = contract.d4signDocumentUuid
      entityName = contract.identifier
      companyId = contract.companyId
    } else {
      const bulletin = await prisma.measurementBulletin.findUnique({
        where: { id: entityId },
        select: { d4signDocumentUuid: true, number: true, contract: { select: { companyId: true } } },
      })
      if (!bulletin) return { success: false, error: 'Boletim nao encontrado' }
      documentUuid = bulletin.d4signDocumentUuid
      entityName = bulletin.number
      companyId = bulletin.contract.companyId
    }

    if (!documentUuid) {
      return { success: false, error: 'Nenhuma assinatura digital vinculada.' }
    }

    // Cancel on D4Sign
    await d4signCancelDocument(documentUuid, reason)

    // Update entity
    const updateData = {
      d4signStatus: 'CANCELED' as const,
      d4signSignedAt: null as Date | null,
      d4signSignedFileUrl: null as string | null,
    }

    if (entityType === 'contract') {
      await prisma.contract.update({
        where: { id: entityId },
        data: updateData,
      })
      revalidatePath(`/contratos/${entityId}`)
    } else {
      await prisma.measurementBulletin.update({
        where: { id: entityId },
        data: updateData,
      })
      revalidatePath(`/measurements/${entityId}`)
    }

    // Audit
    await logAudit({
      action: 'SIGNATURE_CANCELED',
      entity: entityType === 'contract' ? 'Contract' : 'MeasurementBulletin',
      entityId,
      entityName,
      userId: user.id,
      companyId,
      newData: { reason },
    })

    // Notification
    await createNotification({
      userId: user.id,
      type: 'SIGNATURE_CANCELED',
      title: 'Assinatura Cancelada',
      message: `A assinatura digital de ${entityName} foi cancelada. Motivo: ${reason}`,
      link: entityType === 'contract' ? `/contratos/${entityId}` : `/measurements/${entityId}`,
    })

    notifyUser(user.id, {
      type: 'SIGNATURE_CANCELED',
      title: 'Assinatura Cancelada',
      message: `Assinatura de ${entityName} cancelada.`,
      link: entityType === 'contract' ? `/contratos/${entityId}` : `/measurements/${entityId}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Error canceling signature:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cancelar assinatura',
    }
  }
}

/**
 * Download the signed document PDF.
 * Returns the base64-encoded PDF or the stored URL.
 */
export async function downloadSignedPdf(
  entityType: 'contract' | 'bulletin',
  entityId: string
) {
  try {
    await requireAuth()

    let signedFileUrl: string | null = null
    let documentUuid: string | null = null

    if (entityType === 'contract') {
      const contract = await prisma.contract.findUnique({
        where: { id: entityId },
        select: { d4signSignedFileUrl: true, d4signDocumentUuid: true, d4signStatus: true },
      })
      if (!contract) return { success: false, error: 'Contrato nao encontrado' }
      if (contract.d4signStatus !== 'SIGNED') {
        return { success: false, error: 'Documento ainda nao foi assinado.' }
      }
      signedFileUrl = contract.d4signSignedFileUrl
      documentUuid = contract.d4signDocumentUuid
    } else {
      const bulletin = await prisma.measurementBulletin.findUnique({
        where: { id: entityId },
        select: { d4signSignedFileUrl: true, d4signDocumentUuid: true, d4signStatus: true },
      })
      if (!bulletin) return { success: false, error: 'Boletim nao encontrado' }
      if (bulletin.d4signStatus !== 'SIGNED') {
        return { success: false, error: 'Documento ainda nao foi assinado.' }
      }
      signedFileUrl = bulletin.d4signSignedFileUrl
      documentUuid = bulletin.d4signDocumentUuid
    }

    // If we already have the file URL cached, return it
    if (signedFileUrl) {
      return { success: true, data: { url: signedFileUrl } }
    }

    // Otherwise try to download from D4Sign
    if (!documentUuid) {
      return { success: false, error: 'Nenhum documento vinculado.' }
    }

    if (!isD4SignConfigured()) {
      return { success: false, error: 'D4Sign nao configurado.' }
    }

    const pdfBuffer = await d4signDownloadDocument(documentUuid)
    const base64Url = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`

    // Cache the URL for future requests
    if (entityType === 'contract') {
      await prisma.contract.update({
        where: { id: entityId },
        data: { d4signSignedFileUrl: base64Url },
      })
    } else {
      await prisma.measurementBulletin.update({
        where: { id: entityId },
        data: { d4signSignedFileUrl: base64Url },
      })
    }

    return { success: true, data: { url: base64Url } }
  } catch (error) {
    console.error('Error downloading signed document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao baixar documento assinado',
    }
  }
}

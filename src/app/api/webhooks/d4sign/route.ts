import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/sse-notifications'
import {
  getDocumentStatus,
  downloadSignedDocument,
  isD4SignConfigured,
} from '@/lib/d4sign'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// HMAC Validation
// ---------------------------------------------------------------------------

function validateHmacSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false

  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const expected = hmac.digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expected.length) return false

  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/d4sign
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.D4SIGN_WEBHOOK_SECRET

    // Read raw body for HMAC validation
    const rawBody = await request.text()

    // Validate HMAC if secret is configured
    if (webhookSecret) {
      const signature =
        request.headers.get('x-d4sign-signature') ??
        request.headers.get('x-webhook-signature')

      if (!validateHmacSignature(rawBody, signature, webhookSecret)) {
        console.warn('D4Sign webhook: Invalid HMAC signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Parse payload
    let payload: {
      type_post?: string
      uuid_document?: string
      type_event?: string
    }

    try {
      payload = JSON.parse(rawBody)
    } catch {
      // D4Sign sometimes sends form-encoded data
      const params = new URLSearchParams(rawBody)
      payload = {
        type_post: params.get('type_post') ?? undefined,
        uuid_document: params.get('uuid_document') ?? undefined,
        type_event: params.get('type_event') ?? undefined,
      }
    }

    const { uuid_document } = payload

    if (!uuid_document) {
      return NextResponse.json({ ok: true, message: 'No document UUID' }, { status: 200 })
    }

    // Find entity by d4signDocumentUuid
    const [contract, bulletin] = await Promise.all([
      prisma.contract.findFirst({
        where: { d4signDocumentUuid: uuid_document },
        select: {
          id: true,
          identifier: true,
          companyId: true,
          d4signStatus: true,
        },
      }),
      prisma.measurementBulletin.findFirst({
        where: { d4signDocumentUuid: uuid_document },
        select: {
          id: true,
          number: true,
          d4signStatus: true,
          engineerId: true,
          managerId: true,
          createdById: true,
          contract: { select: { companyId: true } },
        },
      }),
    ])

    if (!contract && !bulletin) {
      console.warn(`D4Sign webhook: No entity found for document ${uuid_document}`)
      return NextResponse.json({ ok: true, message: 'Entity not found' }, { status: 200 })
    }

    // Sync status from D4Sign
    if (isD4SignConfigured()) {
      try {
        const status = await getDocumentStatus(uuid_document)

        const allSigned =
          status.signers &&
          status.signers.length > 0 &&
          status.signers.every((s) => s.status === 'signed')

        if (allSigned) {
          // Try to download signed PDF
          let signedFileUrl: string | null = null
          try {
            const signedPdf = await downloadSignedDocument(uuid_document)
            signedFileUrl = `data:application/pdf;base64,${signedPdf.toString('base64')}`
          } catch {
            // Will retry later
          }

          const updateData = {
            d4signStatus: 'SIGNED' as const,
            d4signSignedAt: new Date(),
            d4signSignedFileUrl: signedFileUrl,
          }

          if (contract) {
            await prisma.contract.update({
              where: { id: contract.id },
              data: updateData,
            })

            // Find admin/manager users in company to notify
            const companyUsers = await prisma.user.findMany({
              where: {
                companyId: contract.companyId,
                role: { in: ['ADMIN', 'MANAGER'] },
              },
              select: { id: true },
            })

            const userIds = companyUsers.map((u) => u.id)

            notifyUsers(userIds, {
              type: 'SIGNATURE_COMPLETED',
              title: 'Contrato Assinado',
              message: `O contrato ${contract.identifier} foi assinado por todos os signatarios.`,
              link: `/contratos/${contract.id}`,
            })

            // Persist notifications
            if (userIds.length > 0) {
              await prisma.notification.createMany({
                data: userIds.map((userId) => ({
                  userId,
                  companyId: contract.companyId,
                  type: 'SIGNATURE_COMPLETED',
                  title: 'Contrato Assinado',
                  message: `O contrato ${contract.identifier} foi assinado digitalmente.`,
                  link: `/contratos/${contract.id}`,
                })),
              })
            }
          }

          if (bulletin) {
            await prisma.measurementBulletin.update({
              where: { id: bulletin.id },
              data: updateData,
            })

            // Notify involved users
            const userIds = Array.from(
              new Set(
                [bulletin.engineerId, bulletin.managerId, bulletin.createdById].filter(
                  Boolean
                ) as string[]
              )
            )

            notifyUsers(userIds, {
              type: 'SIGNATURE_COMPLETED',
              title: 'Boletim Assinado',
              message: `O boletim ${bulletin.number} foi assinado por todos os signatarios.`,
              link: `/measurements/${bulletin.id}`,
            })

            // Persist notifications
            if (userIds.length > 0) {
              await prisma.notification.createMany({
                data: userIds.map((userId) => ({
                  userId,
                  companyId: bulletin.contract.companyId,
                  type: 'SIGNATURE_COMPLETED',
                  title: 'Boletim Assinado',
                  message: `O boletim ${bulletin.number} foi assinado digitalmente.`,
                  link: `/measurements/${bulletin.id}`,
                })),
              })
            }
          }
        }
      } catch (error) {
        console.error('D4Sign webhook: Error syncing status:', error)
        // Don't fail the webhook — D4Sign expects 200
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('D4Sign webhook error:', error)
    // Always return 200 to D4Sign to prevent retries
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

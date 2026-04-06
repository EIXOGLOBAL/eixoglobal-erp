# Integration Services Guide

## Quick Start

All services are singleton instances exported from `src/lib/`:

```typescript
// SEFAZ - NFS-e Issuance
import { sefazService } from '@/lib/sefaz'

// Bank Statement Parser - Multi-format
import { detectBankFormat, parseOFX, parseCNAB240 } from '@/lib/bank-statement-parser'

// WhatsApp Notifications
import { whatsappService } from '@/lib/whatsapp'

// Weather Data
import { weatherService } from '@/lib/weather'
```

## Service Integration Examples

### 1. Emit NFS-e and Notify Client

```typescript
import { sefazService } from '@/lib/sefaz'
import { whatsappService } from '@/lib/whatsapp'

async function emitAndNotify(measurementIds: string[], clientPhone: string) {
  // Create NFS-e
  const nfse = await sefazService.emitirNFSe({
    prestador: { cnpj: '12345678000190' },
    tomador: { cnpj: '98765432000150', razaoSocial: 'Client Corp' },
    servico: { 
      codigoTributacao: '01.01',
      discriminacao: 'Serviço de construção',
      valorServicos: 5000.00,
      aliquota: 0.05
    },
    competencia: '2026-03'
  })

  if (nfse.success) {
    // Notify client
    await whatsappService.notifyBillingClosed(
      clientPhone,
      nfse.numero || 'SIM-001',
      'R$ 5.000,00'
    )
  }
}
```

### 2. Parse Bank Statement and Reconcile

```typescript
import { detectBankFormat, parseOFX, parseCNAB240 } from '@/lib/bank-statement-parser'
import { prisma } from '@/lib/prisma'

async function reconcileStatement(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8')
  const format = detectBankFormat(content)

  let transactions
  if (format === 'OFX') {
    transactions = parseOFX(content)
  } else if (format === 'CNAB240') {
    transactions = parseCNAB240(content)
  }

  // Match with financial records
  for (const trx of transactions) {
    const record = await prisma.financialRecord.findFirst({
      where: {
        amount: trx.amount,
        description: { contains: trx.description.split(' ')[0] }
      }
    })

    if (record) {
      await prisma.financialRecord.update({
        where: { id: record.id },
        data: { status: trx.type === 'CREDIT' ? 'RECEIVED' : 'PAID' }
      })
    }
  }
}
```

### 3. Check Weather Before Field Work

```typescript
import { weatherService } from '@/lib/weather'
import { prisma } from '@/lib/prisma'

async function validateMeasurementConditions(projectId: string, date: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  
  const weather = await weatherService.fetchWeatherForDate(
    project.latitude,
    project.longitude,
    date
  )

  if (weather?.precipitation && weather.precipitation > 5) {
    return {
      allowed: false,
      reason: 'Chuva esperada. Adiar para próximo dia útil.'
    }
  }

  if (weather?.conditionCode === 95 || weather?.conditionCode === 96) {
    return {
      allowed: false,
      reason: 'Tempestade prevista. Não autorizar medição.'
    }
  }

  return { allowed: true }
}
```

### 4. Multi-Notification Workflow

```typescript
import { whatsappService } from '@/lib/whatsapp'

// Trigger approval request
await whatsappService.notifyApprovalRequired(
  '5511987654321',
  'Medição #M-001',
  'Medição de construção aguardando aprovação'
)

// Later: Notify approval
await whatsappService.notifyMeasurementApproved(
  '5511987654321',
  'Projeto São Paulo',
  'R$ 5.500,00'
)

// Finally: Payment received
await whatsappService.notifyPaymentReceived(
  '5511987654321',
  'R$ 5.500,00',
  '2026-03-30'
)
```

## Configuration

### SEFAZ (src/lib/sefaz.ts)
```env
SEFAZ_URL="https://nfse.prefeitura.sp.gov.br/ws/lotenfe.asmx"
SEFAZ_CERTIFICATE_PATH="/path/to/cert.pfx"  # Optional (dev mode without cert)
```

### Weather (src/lib/weather.ts)
```env
OPENWEATHER_API_KEY="abc123def456"  # Optional (falls back to free Open-Meteo)
```

### WhatsApp (src/lib/whatsapp.ts)
```env
# Evolution API
WHATSAPP_PROVIDER="evolution"
WHATSAPP_API_URL="http://localhost:3000/api"
WHATSAPP_API_KEY="your-api-key"
WHATSAPP_INSTANCE_NAME="default"

# OR Twilio
WHATSAPP_PROVIDER="twilio"
WHATSAPP_API_KEY="ACCOUNT_SID:AUTH_TOKEN"
WHATSAPP_FROM_NUMBER="+14155238886"
```

## Error Handling

All services return structured results with `success` flag:

```typescript
const result = await sefazService.emitirNFSe(data)
if (!result.success) {
  console.error('SEFAZ error:', result.error)
  // Handle gracefully
}

const transactions = parseOFX(content) // Returns empty array on failure
if (transactions.length === 0) {
  // File format issue or parsing error
}

const weather = await weatherService.getCurrentWeather(lat, lon)
if (!weather) {
  // API unavailable, continue with default assumptions
}

const whatsappResult = await whatsappService.sendMessage(msg)
if (!whatsappResult.success) {
  // Log but don't fail the main operation
  console.warn('WhatsApp unavailable:', whatsappResult.error)
}
```

## Testing

### Unit Tests (vitest)
```bash
npm run test src/lib/sefaz.test.ts
npm run test src/lib/bank-statement-parser.test.ts
npm run test src/lib/whatsapp.test.ts
npm run test src/lib/weather.test.ts
```

### Integration Tests
```bash
npm run test:e2e
```

### Manual Testing

```typescript
// In a test route or script
import { sefazService } from '@/lib/sefaz'

export async function GET(req: Request) {
  const result = await sefazService.emitirNFSe({
    prestador: { cnpj: '12345678000190' },
    tomador: { cnpj: '98765432000150', razaoSocial: 'Test' },
    servico: {
      codigoTributacao: '01.01',
      discriminacao: 'Test',
      valorServicos: 100,
      aliquota: 0.05
    },
    competencia: '2026-03'
  })
  return Response.json(result)
}
```

## Performance Notes

- **SEFAZ**: Blocking operation (~2-5s). Consider async queues for batch processing.
- **Bank Parser**: Synchronous, fast. OFX (100MB) ~200ms, CNAB240 ~500ms
- **Weather**: Cached at API level. Implement local cache with 30min TTL
- **WhatsApp**: Non-blocking. ~500ms per message. Queue if volume > 10/sec

## Security Considerations

- SEFAZ certificate stored in secure path, never in code
- WhatsApp API keys in environment variables only
- Bank statement data should be encrypted at rest
- Weather API calls don't leak sensitive data
- All services handle errors without exposing internal details

## Future Enhancements

- [ ] SEFAZ: Support for NFe (not just NFS-e)
- [ ] Parser: Add support for TSF, OFX 2.0
- [ ] WhatsApp: Message templating and bulk scheduling
- [ ] Weather: Historical trends and alerts for extreme conditions

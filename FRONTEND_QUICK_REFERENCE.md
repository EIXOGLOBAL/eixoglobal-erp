# Frontend Quick Reference - Fase 4

## Overview

This document provides a quick reference for the completed frontend pages and components. All pages are fully functional with real database integration, form validation, and loading states.

## Navigation Map

### Main Pages

| Page | Path | Purpose | Features |
|------|------|---------|----------|
| **Contratos** | `/contratos` | Contract management | Create/edit/delete with tabs, KPI cards, status tracking |
| **Medições** | `/measurements` | Measurement bulletins | Workflow approval, item editing, status timeline |
| **Composições** | `/composicoes` | Cost compositions | Materials/labor/equipment tabs, BDI calculation |
| **EVM Dashboard** | `/evm` | Earned Value Management | Real-time metrics, S-curve, portfolio summary |
| **Painel de Negócios** | `/business-dashboard` | Business metrics | Financial health, contract metrics, billing status |

## Page Details & API Usage

### 1. Contratos Page (`/contratos`)

#### Server-Side Entry Point
```tsx
// /src/app/(dashboard)/contratos/page.tsx
import { getContracts } from "@/app/actions/contract-actions"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { ContractsTable } from "@/components/contracts/contracts-table"
```

#### Key Components

**Create/Edit Dialog** (`contract-dialog.tsx`)
- Tabbed form with 3 sections
- Zod validation for 18 fields
- Server action integration

```tsx
<ContractDialog
  projects={projects}
  contractors={contractors}
  companyId={companyId}
  contract={contractData} // optional for edit
/>
```

**Table Component** (`contracts-table.tsx`)
- Status filtering and search
- Delete confirmation dialog
- Edit integration
- Status badges

#### Form Tabs

1. **Dados Gerais**
   - identifier, contractNumber, project, contractor
   - contractType, modalidade, object, description
   - startDate, endDate, status

2. **Valores e Prazos**
   - value, executionDeadline, baselineEndDate
   - reajusteIndex, reajusteBaseDate
   - retentionPercent, paymentTerms

3. **Garantias**
   - warrantyValue, warrantyExpiry
   - fiscalName, witnessNames

#### Server Actions

```typescript
// Create contract
const result = await createContract(data, companyId)

// Update contract
const result = await updateContract(contractId, data)

// Delete contract
const result = await deleteContract(contractId)
```

---

### 2. Medições Page (`/measurements`)

#### Server-Side Entry Point
```tsx
// /src/app/(dashboard)/measurements/page.tsx
import { getMeasurementBulletins } from "@/app/actions/bulletin-actions"
import { CreateBulletinDialog } from "@/components/bulletins/create-bulletin-dialog"
import { BulletinsTable } from "@/components/bulletins/bulletins-table"
```

#### Key Components

**Create Dialog** (`create-bulletin-dialog.tsx`)
```tsx
<CreateBulletinDialog
  projects={projects}
  userId={userId}
  defaultProjectId={projectId}
/>
```

**Bulletin Details Page** (`[id]/page.tsx`)
- Tabs: Details, Items, Amendments, Adjustments, Measurements
- Items editor with inline editing
- Approval workflow buttons
- Timeline showing approval history

**Status Workflow**
- DRAFT → SUBMITTED → ENGINEER_APPROVED → MANAGER_APPROVED → APPROVED → REJECTED

#### Bulletin Item Fields
- description, unit, quantity, unitPrice
- contractedQuantity, previousMeasured, currentMeasured, accumulatedMeasured
- currentValue, accumulatedValue, percentageExecuted

---

### 3. Composições Page (`/composicoes`)

#### Server-Side Entry Point
```tsx
// /src/app/(dashboard)/composicoes/page.tsx
import { getCostCompositions } from "@/app/actions/cost-composition-actions"
import { CompositionDialog } from "@/components/compositions/composition-dialog"
```

#### Key Components

**Detail Page** (`[id]/page.tsx`)
- General info section
- Three-tab content editor
- Cost summary card
- Comparison panel

**Tab 1: Materials** (`CompositionMaterial`)
```
description | unit | coefficient | unitCost | wasteFactor | totalCost
```

**Tab 2: Labor** (`CompositionLabor`)
```
description | hours | hourlyRate | encargos | totalCost
```

**Tab 3: Equipment** (`CompositionEquipment`)
```
description | unit | coefficient | unitCost | operatorIncluded | fuelCost | totalCost
```

#### Cost Calculation Formula
```
directCost = materials_total + labor_total + equipment_total
bdiValue = directCost * (bdi / 100)
salePrice = directCost + bdiValue
```

---

### 4. EVM Dashboard (`/evm`)

#### Server-Side Entry Point
```tsx
// /src/app/(dashboard)/evm/page.tsx
import {
  getAllProjectsEVMData,
  getPortfolioEVMSummary,
} from "@/app/actions/evm-actions"
```

#### Key Functions

**Get Project EVM**
```typescript
const projectEVM = await getProjectEVMData(projectId)
// Returns: { id, name, status, budget, pv, ev, ac, sv, cv, spi, cpi, eac, etc, vac }
```

**Get Portfolio Summary**
```typescript
const summary = await getPortfolioEVMSummary(companyId)
// Returns: { totalPV, totalEV, totalAC, totalBudget, portfolioSPI, portfolioCPI, healthStatus }
```

**Get S-Curve Data**
```typescript
const curveData = await getProjectSCurveData(projectId)
// Returns: [{ month, pv, ev, ac }, ...]
```

#### EVM Metrics Explained

| Metric | Formula | Meaning |
|--------|---------|---------|
| **PV** | Budget × (Time Elapsed %) | What should be spent |
| **EV** | Approved Bulletin Value | What was earned |
| **AC** | Paid Financial Records | What was actually spent |
| **SV** | EV - PV | Schedule variance (time) |
| **CV** | EV - AC | Cost variance (money) |
| **SPI** | EV / PV | Schedule efficiency (>1 = ahead) |
| **CPI** | EV / AC | Cost efficiency (>1 = under budget) |
| **EAC** | Budget / CPI | Estimate at completion |
| **ETC** | EAC - AC | Work remaining |
| **VAC** | Budget - EAC | Budget variance |

#### Health Status
```
Green:  SPI >= 0.95 AND CPI >= 0.95
Yellow: SPI >= 0.85 AND CPI >= 0.85
Red:    SPI < 0.85 OR CPI < 0.85
```

---

### 5. Business Dashboard (`/business-dashboard`)

#### KPI Cards (BUS-01)
1. **Projetos Ativos** - Count of non-completed projects
2. **Orçamento Total** - Sum of all project budgets
3. **Lucro Líquido** - Revenue - Expenses
4. **Colaboradores** - Count of active employees

#### Tab 1: Contracts (BUS-02)
- Total active contracts count
- Sum of contract values
- Average contract value

#### Tab 2: Measurements (BUS-03)
- Approved bulletins count
- Total measured value
- Billing rate (measured / contract value)

#### Tab 3: Financial (BUS-04)
- Total revenue (INCOME, PAID)
- Total expenses (EXPENSE, PAID)
- Net profit and profit margin

---

## Form Validation

### Zod Schemas

#### Contract Schema
```typescript
z.object({
  identifier: z.string().min(3),
  contractNumber: z.string().optional(),
  description: z.string().optional(),
  projectId: z.string().min(1), // required
  contractorId: z.string().optional().nullable(),
  value: z.number().min(0).optional(),
  startDate: z.string(), // required
  endDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'COMPLETED', 'CANCELLED']),
  contractType: z.string().optional(),
  // ... additional fields
}).refine((data) => {
  if (data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate)
  }
  return true
}, { message: "End date must be after start date" })
```

### Client-Side Validation Display
- Inline error messages under each field
- Submit button disabled while validating
- Form-level error summary

### Server-Side Validation
- All server actions validate with Zod
- Safe type inference with TypeScript
- Detailed error messages returned to client

---

## Loading States & Notifications

### Loading Skeleton Components
```tsx
import { PageLoadingSkeleton } from "@/components/ui/loading-skeleton"

// Use during data loading
<Suspense fallback={<PageLoadingSkeleton />}>
  <YourContent />
</Suspense>
```

### Toast Notifications
```tsx
const { toast } = useToast()

// Success
toast({
  title: "Sucesso",
  description: "Operação realizada com êxito"
})

// Error
toast({
  variant: "destructive",
  title: "Erro",
  description: error.message
})
```

### Button Loading States
```tsx
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Enviar
</Button>
```

---

## Data Flow Examples

### Creating a Contract

```
1. User clicks "Novo Contrato"
   ↓
2. ContractDialog opens with form
   ↓
3. User fills form and clicks submit
   ↓
4. Form validates with Zod schema
   ↓
5. Server action: createContract() called
   ↓
6. Server validates again with Zod
   ↓
7. Database insert with all 18 fields
   ↓
8. Toast notification shown
   ↓
9. Page reloads to show new contract
```

### Viewing EVM Dashboard

```
1. User navigates to /evm
   ↓
2. page.tsx calls getAllProjectsEVMData()
   ↓
3. Server queries projects, bulletins, financial records
   ↓
4. calculateEVMMetrics() computes SPI, CPI, etc.
   ↓
5. EVMContent renders with real data
   ↓
6. User can select specific project from dropdown
```

---

## Common Patterns

### Page Template
```tsx
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function MyPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const companyId = session.user?.companyId
  if (!companyId) redirect("/login")

  // Fetch data in parallel
  const [data1, data2] = await Promise.all([
    fetchData1(companyId),
    fetchData2(companyId),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* KPI Cards */}
      {/* Content */}
    </div>
  )
}
```

### Dialog Component Pattern
```tsx
'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const formSchema = z.object({
  // fields
})

export function MyDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  })

  async function onSubmit(values) {
    setLoading(true)
    try {
      const result = await myServerAction(values)
      if (result.success) {
        toast({ title: "Sucesso" })
        setOpen(false)
      } else {
        toast({ variant: "destructive", title: "Erro", description: result.error })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Fields */}
            <Button disabled={loading}>
              {loading && <Loader2 />}
              Submit
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Troubleshooting

### Issue: Form not validating
**Check:**
- Zod schema is correct
- zodResolver is applied to useForm
- FormMessage components are present
- Server action validates data

### Issue: Loading states not showing
**Check:**
- useState(false) for loading state
- Button disabled={loading}
- Loading spinner icon rendered conditionally
- setLoading(false) in finally block

### Issue: Toast notifications not appearing
**Check:**
- useToast() is called
- toast() function is called with proper params
- useToast hook is from correct path (@/hooks/use-toast)

### Issue: EVM metrics showing zero
**Check:**
- Project has contracts with values
- Bulletins are marked as APPROVED status
- Financial records exist and are PAID status
- Company ID matches user's companyId

---

## File Locations Reference

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── contratos/
│   │   │   ├── page.tsx           # List page
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Detail page
│   │   │       └── print/
│   │   │           └── page.tsx
│   │   ├── measurements/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── composicoes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── evm/
│   │   │   ├── page.tsx
│   │   │   ├── evm-content.tsx
│   │   │   └── _components/
│   │   │       ├── evm-data.ts
│   │   │       └── evm-helpers.ts
│   │   └── business-dashboard/
│   │       └── page.tsx
│   └── actions/
│       ├── contract-actions.ts
│       ├── bulletin-actions.ts
│       ├── cost-composition-actions.ts
│       └── evm-actions.ts
├── components/
│   ├── contracts/
│   │   ├── contract-dialog.tsx
│   │   └── contracts-table.tsx
│   ├── bulletins/
│   │   ├── create-bulletin-dialog.tsx
│   │   ├── bulletins-table.tsx
│   │   └── [more bulletin components]
│   ├── compositions/
│   │   ├── composition-dialog.tsx
│   │   └── [more composition components]
│   ├── evm/
│   │   └── evm-kpi-card.tsx
│   └── ui/
│       ├── loading-skeleton.tsx
│       └── [shadcn components]
└── lib/
    └── prisma.ts
```

---

## Production Checklist

- [ ] All forms validate input client and server-side
- [ ] Toast notifications appear for all operations
- [ ] Loading states display during data fetches
- [ ] Error messages are user-friendly Portuguese
- [ ] Currency formatting uses pt-BR locale
- [ ] Dates use consistent format
- [ ] All links work correctly
- [ ] Responsive design on mobile/tablet
- [ ] Performance acceptable with large datasets
- [ ] Security: user can only see their company's data
- [ ] No console errors or warnings
- [ ] Page transitions are smooth

---

## Support

For issues or questions about the implementation, refer to:
1. `/FRONTEND_COMPLETION_SUMMARY.md` - Detailed documentation
2. Component source code comments
3. Prisma schema for data model reference
4. Server action implementations for business logic

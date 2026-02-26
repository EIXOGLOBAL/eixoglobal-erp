# 🏗️ EXPANSÃO DO SCHEMA - ERP PROFISSIONAL

## 🎯 NOVOS MODELOS A ADICIONAR

### 1. **ContractAmendment** (Termos Aditivos)
```prisma
model ContractAmendment {
  id            String   @id @default(uuid())
  number        String   // "TA-001", "TA-002"
  description   String
  type          AmendmentType // VALUE_CHANGE, DEADLINE_CHANGE, SCOPE_CHANGE
  oldValue      Decimal?
  newValue      Decimal?
  oldEndDate    DateTime?
  newEndDate    DateTime?
  justification String
  approvedAt    DateTime?
  approvedBy    String?
  
  contractId    String
  contract      Contract @relation(fields: [contractId], references: [id])
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 2. **ContractAdjustment** (Reajustes de Preço)
```prisma
model ContractAdjustment {
  id            String   @id @default(uuid())
  indexType     String   // "INCC", "IPCA", "IGP-M"
  baseDate      DateTime
  adjustmentDate DateTime
  oldIndex      Decimal
  newIndex      Decimal
  percentage    Decimal  // Calculated automatically
  appliedValue  Decimal  // Value after adjustment
  
  contractId    String
  contract      Contract @relation(fields: [contractId], references: [id])
  
  items         ContractItemAdjustment[]
  
  createdAt     DateTime @default(now())
}

model ContractItemAdjustment {
  id                  String   @id @default(uuid())
  oldUnitPrice        Decimal
  newUnitPrice        Decimal
  
  contractItemId      String
  contractItem        ContractItem @relation(fields: [contractItemId], references: [id])
  
  adjustmentId        String
  adjustment          ContractAdjustment @relation(fields: [adjustmentId], references: [id])
}
```

### 3. **MeasurementBulletin** (Boletim de Medição)
```prisma
model MeasurementBulletin {
  id              String   @id @default(uuid())
  number          String   // "BM-001-2026"
  referenceMonth  String   // "01/2026"
  startDate       DateTime
  endDate         DateTime
  totalValue      Decimal
  status          BulletinStatus @default(DRAFT)
  
  // Workflow
  sentForApprovalAt    DateTime?
  approvedByEngineerAt DateTime?
  approvedByManagerAt  DateTime?
  approvedByClientAt   DateTime?
  rejectedAt           DateTime?
  rejectionReason      String?
  
  // Who
  engineerId      String?
  engineer        User? @relation("BulletinEngineer", fields: [engineerId], references: [id])
  
  managerId       String?
  manager         User? @relation("BulletinManager", fields: [managerId], references: [id])
  
  projectId       String
  project         Project @relation(fields: [projectId], references: [id])
  
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  
  items           MeasurementBulletinItem[]
  attachments     MeasurementAttachment[]
  comments        MeasurementComment[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 4. **MeasurementBulletinItem** (Itens do Boletim)
```prisma
model MeasurementBulletinItem {
  id                    String   @id @default(uuid())
  
  // From Contract Item
  description           String
  unit                  String
  unitPrice             Decimal
  
  // Quantities
  contractedQuantity    Decimal  // Total no contrato
  previousMeasured      Decimal  // Medido anteriormente
  currentMeasured       Decimal  // Medindo agora
  totalMeasured         Decimal  // Acumulado
  remainingQuantity     Decimal  // Saldo
  
  // Values
  currentValue          Decimal  // Valor desta medição
  totalValue            Decimal  // Valor acumulado
  
  // Percentages
  executionPercentage   Decimal  // % executado
  
  contractItemId        String
  contractItem          ContractItem @relation(fields: [contractItemId], references: [id])
  
  bulletinId            String
  bulletin              MeasurementBulletin @relation(fields: [bulletinId], references: [id])
  
  createdAt             DateTime @default(now())
}
```

### 5. **MeasurementAttachment** (Anexos - Fotos, PDFs)
```prisma
model MeasurementAttachment {
  id          String   @id @default(uuid())
  fileName    String
  fileType    String
  fileSize    Int
  filePath    String   // Local or cloud storage path
  description String?
  
  bulletinId  String
  bulletin    MeasurementBulletin @relation(fields: [bulletinId], references: [id])
  
  uploadedById String
  uploadedBy   User @relation(fields: [uploadedById], references: [id])
  
  createdAt   DateTime @default(now())
}
```

### 6. **MeasurementComment** (Comentários no Workflow)
```prisma
model MeasurementComment {
  id          String   @id @default(uuid())
  text        String
  type        CommentType // APPROVAL, REJECTION, OBSERVATION, QUESTION
  
  bulletinId  String
  bulletin    MeasurementBulletin @relation(fields: [bulletinId], references: [id])
  
  authorId    String
  author      User @relation(fields: [authorId], references: [id])
  
  createdAt   DateTime @default(now())
}
```

### 7. **ProjectCostComposition** (Composição de Custos)
```prisma
model CostComposition {
  id              String   @id @default(uuid())
  code            String   // "COMP-001"
  description     String
  unit            String
  totalUnitCost   Decimal  // Custo total unitário
  bdi             Decimal  // % BDI
  salePrice       Decimal  // Preço de venda
  
  projectId       String?
  project         Project? @relation(fields: [projectId], references: [id])
  
  materials       CompositionMaterial[]
  labor           CompositionLabor[]
  equipment       CompositionEquipment[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CompositionMaterial {
  id              String   @id @default(uuid())
  description     String
  unit            String
  quantity        Decimal
  unitCost        Decimal
  totalCost       Decimal
  
  compositionId   String
  composition     CostComposition @relation(fields: [compositionId], references: [id])
}

model CompositionLabor {
  id              String   @id @default(uuid())
  description     String
  unit            String
  hours           Decimal
  hourlyRate      Decimal
  totalCost       Decimal
  
  compositionId   String
  composition     CostComposition @relation(fields: [compositionId], references: [id])
}

model CompositionEquipment {
  id              String   @id @default(uuid())
  description     String
  unit            String
  quantity        Decimal
  unitCost        Decimal
  totalCost       Decimal
  
  compositionId   String
  composition     CostComposition @relation(fields: [compositionId], references: [id])
}
```

## 📊 ENUMS ADICIONAIS

```prisma
enum AmendmentType {
  VALUE_CHANGE
  DEADLINE_CHANGE
  SCOPE_CHANGE
  MIXED
}

enum BulletinStatus {
  DRAFT
  PENDING_ENGINEER
  PENDING_MANAGER
  PENDING_CLIENT
  APPROVED
  REJECTED
  BILLED
  PAID
}

enum CommentType {
  APPROVAL
  REJECTION
  OBSERVATION
  QUESTION
  CLARIFICATION
}
```

## 🔧 MODIFICAÇÕES EM MODELOS EXISTENTES

### Contract - Adicionar relações:
```prisma
model Contract {
  // ... existing fields ...
  
  amendments      ContractAmendment[]
  adjustments     ContractAdjustment[]
  bulletins       MeasurementBulletin[]
}
```

### ContractItem - Adicionar relações:
```prisma
model ContractItem {
  // ... existing fields ...
  
  adjustments     ContractItemAdjustment[]
  bulletinItems   MeasurementBulletinItem[]
}
```

### Project - Adicionar relações:
```prisma
model Project {
  // ... existing fields ...
  
  bulletins       MeasurementBulletin[]
  compositions    CostComposition[]
}
```

---

## 🚀 PRÓXIMA AÇÃO

Aplicar estas mudanças ao schema.prisma e rodar:
```bash
npx prisma db push
npx prisma generate
```

# Implementação de Boletins de Medição - Documentação Técnica

## Visão Geral

O módulo de Boletins de Medição oferece uma solução completa e profissional para gerenciar medições em projetos de engenharia civil. O sistema inclui listagem avançada, edição com cálculos automáticos, workflow de aprovação e impressão.

## Estrutura de Páginas

### 1. Listagem de Boletins (`/measurements/page.tsx`)

**Funcionalidades:**
- Dashboard com estatísticas gerais (KPIs)
- Pipeline visual de workflow (Rascunho → Enviado → Aprovado → Faturado)
- Filtros avançados (status, projeto, período)
- Gráficos de tendência mensal
- Estatísticas gráficas (distribuição por status, valor médio)
- Tabela interativa com busca e filtros

**Componentes Utilizados:**
- `BulletinsSummaryStats`: Exibe 8 cards com métricas principais
- `WorkflowPipeline`: Mostra o fluxo visual de status
- `MonthlySummaryChart`: Gráfico de barras com valores por mês
- `BulletinsAdvancedStats`: Gráficos Pie e Bar com análises
- `BulletinsTable`: Tabela com filtros e ações
- `BulletinsHelpPanel`: Painel colapsível com instruções

### 2. Detalhes e Edição (`/measurements/[id]/page.tsx`)

**Funcionalidades:**
- Header com informações principais e status visual
- Cards de resumo (total de itens, valor, período)
- Painel de rejeição (se aplicável)
- Cards de análise:
  - Comparação (atual vs acumulado vs saldo)
  - Execução do contrato (gráfico de progresso)
- Timeline visual do histórico de status
- Painel de metadados (responsáveis, datas)
- Tabs de conteúdo:
  - **Itens da Medição**: Tabela editável com cálculos automáticos
  - **Anexos**: Upload de fotos e documentação
  - **Comentários**: Sistema de discussão e observações
- Botões de workflow (enviar, aprovar, rejeitar)
- Assinatura digital (quando aplicável)

**Componentes Utilizados:**
- `BulletinRejectionPanel`: Alerta com motivo de rejeição
- `ContractExecutionChart`: Gráfico de execução contratual
- `BulletinTimeline`: Linha do tempo de status
- `BulletinMetadataPanel`: Informações de responsáveis
- `BulletinItemsTableEnhanced`: Tabela profissional de itens
- `BulletinActionButtons`: Botões de workflow
- `CommentsSection`: Sistema de comentários
- `AttachmentUploader`: Upload de arquivos

### 3. Impressão (`/measurements/[id]/print/page.tsx`)

**Funcionalidades:**
- Layout otimizado para PDF
- Resumo profissional do boletim
- Tabela completa de itens com valores
- Assinaturas e selos
- Informações de auditoria

**Componentes Utilizados:**
- `PrintBulletinClient`: Cliente de impressão completo
- `BulletinPrintSummary`: Resumo para PDF

## Componentes Principais

### BulletinsSummaryStats
Exibe 8 cards com métricas principais:
- Total de boletins
- Pendentes de aprovação
- Aprovados
- Valor aprovado
- Execução geral (com barra de progresso)
- Rejeitados
- Faturados

```tsx
<BulletinsSummaryStats
  totalBulletins={10}
  draftBulletins={2}
  pendingBulletins={3}
  approvedBulletins={4}
  rejectedBulletins={1}
  billedBulletins={0}
  approvedValue={150000}
  totalMeasuredValue={180000}
  executionPercentage={75.5}
/>
```

### ContractExecutionChart
Análise visual de execução contratual com:
- Barra de progresso interativa
- Alerta de sobra
- Breakdown por valor (contrato, acumulado, atual, saldo)
- Indicadores de margem

```tsx
<ContractExecutionChart
  contractValue={200000}
  accumulatedValue={150000}
  currentValue={20000}
  remainingValue={50000}
  executionPercentage={75}
/>
```

### BulletinTimeline
Linha do tempo visual mostrando:
- Criação do boletim
- Envio para aprovação
- Aprovação
- Rejeição (se aplicável)
- Faturamento

### BulletinWorkflowActions
Botões contextuais que mudam conforme o status:
- **DRAFT/REJECTED**: Botão "Enviar para Aprovação"
- **PENDING_APPROVAL**: Botões "Aprovar" e "Rejeitar" com dialogs
- **APPROVED/BILLED**: Badge com status

### BulletinsFilterPanel
Painel de filtros profissional com:
- Busca por texto livre
- Filtro por status
- Filtro por projeto
- Filtro por contrato
- Filtro por período
- Tags de filtros ativos
- Botão para limpar tudo

### BulletinItemInlineEditor
Editor inline para quantidades com:
- Validação em tempo real
- Alerta de sobra de quantidade
- Salvar/cancelar com shortcuts

### BulletinsAdvancedStats
Análise gráfica com Recharts:
- Pie chart: Distribuição por status
- Bar chart: Valor medido por mês
- Cards: Valor médio por status

## Fluxo de Dados

### Criação de Boletim
1. Usuário clica "Novo Boletim"
2. Dialog `CreateBulletinDialog` abre
3. Seleciona projeto e contrato
4. Sistema carrega itens do contrato automaticamente
5. `createMeasurementBulletin` cria boletim com itens zerados
6. Usuário edita quantidades em cada item
7. Valores são calculados automaticamente

### Envio para Aprovação
1. Usuário clica "Enviar para Aprovação"
2. Status muda de DRAFT → PENDING_APPROVAL
3. `submitBulletinForApproval` registra timestamp
4. Notificações são enviadas para aprovadores
5. Boletim fica bloqueado para edição

### Aprovação
1. Aprovador (ADMIN/MANAGER/ENGINEER) vê boletim pendente
2. Revisa itens e anexos
3. Clica "Aprovar" (opcional: adiciona comentário)
4. `approveByEngineer` muda status para APPROVED
5. Timestamp registrado
6. Notificação retorna para criador

### Rejeição
1. Aprovador vê motivo para rejeitar
2. Clica "Rejeitar" e fornece motivo detalhado
3. `rejectBulletin` muda status para REJECTED
4. Motivo salvo em `rejectionReason`
5. Boletim volta para modo edição
6. Criador recebe notificação com motivo

## Actions Server-Side (bulletin-actions.ts)

### Principais Funções

#### `createMeasurementBulletin(userId, data)`
- Valida dados com Zod schema
- Busca itens do contrato
- Auto-popula itens se lista vazia
- Calcula valores para cada item (unitPrice × quantity)
- Retorna boletim criado

#### `submitBulletinForApproval(bulletinId, userId)`
- Muda status DRAFT → PENDING_APPROVAL
- Registra timestamp `submittedAt`
- Notifica managers/admins

#### `approveByEngineer(data, userId)`
- Muda status PENDING_APPROVAL → APPROVED
- Registra `approvedByEngineerAt`
- Registra `engineerId`
- Cria comentário tipo APPROVAL se fornecido
- Notifica criador

#### `rejectBulletin(data, userId)`
- Muda status PENDING_APPROVAL → REJECTED
- Registra `rejectedAt`
- Salva motivo em `rejectionReason`
- Cria comentário tipo REJECTION
- Notifica criador

#### `updateBulletinItem(itemId, currentMeasured)`
- Atualiza quantidade medida
- Recalcula valores automáticos:
  - `accumulatedMeasured` = previousMeasured + currentMeasured
  - `balanceQuantity` = contractedQuantity - accumulatedMeasured
  - `currentValue` = currentMeasured × unitPrice
  - `accumulatedValue` = accumulatedMeasured × unitPrice
  - `percentageExecuted` = (accumulatedMeasured / contractedQuantity) × 100
- Atualiza `totalValue` do boletim

#### `addBulletinComment(bulletinId, authorId, data)`
- Cria novo comentário
- Tipos: OBSERVATION, QUESTION, APPROVAL, REJECTION
- Opção de comentário interno

#### `saveBulletinAttachment(bulletinId, uploadedById, fileData)`
- Registra arquivo enviado
- Associa com boletim
- Inclui metadata (tipo, tamanho, descrição)

## Modelo de Dados (Prisma)

### MeasurementBulletin
```prisma
model MeasurementBulletin {
  id String @id @default(uuid())
  number String // "BM-001/2026"
  referenceMonth String // "01/2026"
  periodStart DateTime
  periodEnd DateTime
  totalValue Decimal @db.Decimal(18, 4)
  status String // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, BILLED

  submittedAt DateTime?
  approvedByEngineerAt DateTime?
  rejectedAt DateTime?
  rejectionReason String?

  projectId String
  contractId String
  createdById String
  engineerId String?
  managerId String?

  items MeasurementBulletinItem[]
  attachments BulletinAttachment[]
  comments BulletinComment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### MeasurementBulletinItem
```prisma
model MeasurementBulletinItem {
  id String @id @default(uuid())

  itemCode String?
  description String
  unit String
  unitPrice Decimal @db.Decimal(18, 4)

  contractedQuantity Decimal @db.Decimal(18, 4)
  previousMeasured Decimal @default(0)
  currentMeasured Decimal
  accumulatedMeasured Decimal
  balanceQuantity Decimal

  currentValue Decimal
  accumulatedValue Decimal
  percentageExecuted Decimal @db.Decimal(5, 2)

  bulletinId String
  contractItemId String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### BulletinAttachment
```prisma
model BulletinAttachment {
  id String @id @default(uuid())
  fileName String
  fileType String
  fileSize Int
  fileUrl String
  description String?

  bulletinId String
  uploadedById String

  createdAt DateTime @default(now())
}
```

### BulletinComment
```prisma
model BulletinComment {
  id String @id @default(uuid())
  text String
  commentType String // APPROVAL, REJECTION, OBSERVATION, QUESTION
  isInternal Boolean @default(false)

  bulletinId String
  authorId String

  createdAt DateTime @default(now())
}
```

## Validações

### Criação de Boletim
- projectId: UUID válido
- contractId: UUID válido
- referenceMonth: "MM/YYYY"
- periodStart: Data válida
- periodEnd: Data válida (após periodStart)
- items: Array com pelo menos um item (ou 0 para auto-populate)

### Atualização de Item
- currentMeasured: >= 0
- Não pode exceder quantidade contratada (aviso, não erro)

### Rejeição
- reason: Mínimo 10 caracteres
- Motivo obrigatório

### Comentário
- text: Mínimo 3 caracteres
- commentType: Um dos tipos permitidos

## Cálculos Automáticos

### Ao criar item do boletim
```
previousMeasured = SUM(medições anteriores aprovadas do mesmo item)
currentValue = currentMeasured × unitPrice
accumulatedMeasured = previousMeasured + currentMeasured
accumulatedValue = accumulatedMeasured × unitPrice
balanceQuantity = contractedQuantity - accumulatedMeasured
percentageExecuted = (accumulatedMeasured / contractedQuantity) × 100
```

### Ao atualizar item
- Todos os valores acima são recalculados
- totalValue do boletim é atualizado

### Ao visualizar boletim
- executionPercentage = (totalValue / contractValue) × 100
- remainingBalance = contractValue - accumulatedValue total

## Permissões e Papéis

| Ação | USER | EMPLOYEE | MANAGER | ADMIN | ENGINEER |
|------|------|----------|---------|-------|----------|
| Ver boletins | ✓ | ✓ | ✓ | ✓ | ✓ |
| Criar boletim | - | ✓ | ✓ | ✓ | ✓ |
| Editar rascunho | Próprio | ✓ | ✓ | ✓ | ✓ |
| Enviar para aprovação | Próprio | ✓ | ✓ | ✓ | ✓ |
| Aprovar | - | - | ✓ | ✓ | ✓ |
| Rejeitar | - | - | ✓ | ✓ | ✓ |
| Assinar digitalmente | Designado | - | - | ✓ | - |

## Notificações

### Tipos de Notificação

1. **BULLETIN_SUBMITTED**
   - Enviado para: ADMIN, MANAGER
   - Acionado: Quando boletim é enviado para aprovação
   - Mensagem: "Boletim {number} aguarda aprovação"

2. **BULLETIN_APPROVED**
   - Enviado para: Criador do boletim
   - Acionado: Quando aprovado
   - Mensagem: "Boletim {number} foi aprovado"

3. **BULLETIN_REJECTED**
   - Enviado para: Criador do boletim
   - Acionado: Quando rejeitado
   - Mensagem: "Boletim {number} foi rejeitado: {motivo}"

## Melhorias Visuais

### Status Badge Colors
- DRAFT: Cinza (outline)
- PENDING_APPROVAL: Azul
- APPROVED: Verde
- REJECTED: Vermelho
- BILLED: Roxo

### Cards de Informação
- Usar ícones Lucide para cada seção
- Cores consistentes com o tema
- Responsivo (grid 1, 2, 3 ou 4 colunas)

### Tabelas
- Header com filtros
- Linhas alternadas em cinza claro
- Hover destacar linha
- Ações no dropdown menu
- Status com badge colorido

### Gráficos
- Recharts com cores vibrantes
- Responsive container 100%
- Tooltip com informações formatadas
- Legend quando aplicável

## Performance

### Otimizações Implementadas
- `getMeasurementBulletins` com includes otimizados
- `getBulletinById` com relações completas
- Índices no banco (projectId, status, contractId)
- Serialização de Decimals para Number no cliente
- Cache revalidation seletiva por rota

### Queries Principais
```
bulletins
├── project (id, name)
├── contract (id, identifier, value)
├── createdBy (id, name)
├── _count
│   ├── items
│   ├── comments
│   └── attachments

bulletinById
├── items (com contractItem)
├── attachments (com uploadedBy)
├── comments (com author)
├── contract (com items)
├── project
├── createdBy, engineer, manager
```

## Exportação e Relatórios

### Componentes de Exportação
- `ExportExcelButton`: Exporta tabela para Excel
- Dados exportados: Número, Projeto, Contrato, Período, Valor, Status

### Impressão (PDF)
- Layout A4 otimizado
- Header com logo empresa
- Tabela de itens
- Resumo de valores
- Espaço para assinaturas
- Rodapé com data e número do boletim

## Testes Recomendados

### Funcionalidade
- [ ] Criar boletim e auto-popular itens
- [ ] Editar quantidade e verificar cálculos
- [ ] Enviar para aprovação (mudar status)
- [ ] Aprovar boletim (com e sem comentário)
- [ ] Rejeitar boletim (com motivo)
- [ ] Upload de anexos
- [ ] Adicionar comentários
- [ ] Imprimir em PDF

### Validação
- [ ] Quantidade 0 é válida
- [ ] Quantidade negativa é bloqueada
- [ ] Quantidade acima do contrato mostra aviso
- [ ] Motivo rejeição mínimo 10 caracteres
- [ ] Comentário mínimo 3 caracteres

### Permissões
- [ ] USER não pode criar boletim
- [ ] EMPLOYEE pode criar mas não aprovar
- [ ] MANAGER pode aprovar e rejeitar
- [ ] Usuário vê apenas boletins da sua empresa

## Próximas Melhorias Sugeridas

1. **Integração D4Sign**
   - Assinatura digital automática
   - Status de assinatura visível

2. **Templates de Boletins**
   - Salvar configuração como template
   - Reutilizar em futuros boletins

3. **Análise Preditiva**
   - ML para alertar sobras potenciais
   - Previsão de conclusão

4. **Webhook de Faturamento**
   - Integrar com sistema de faturamento
   - Auto-gerar nota fiscal

5. **Comparativo de Boletins**
   - Comparar dois ou mais períodos
   - Análise de tendências

6. **Mobile Responsivo**
   - App mobile para campo
   - Offline-first com sync

7. **Inteligência Artificial**
   - Classificar automaticamente itens
   - Detectar anomalias

## Contato e Suporte

Para dúvidas sobre a implementação, consulte:
- Schema Prisma: `/prisma/schema.prisma`
- Actions: `/src/app/actions/bulletin-actions.ts`
- Componentes: `/src/components/bulletins/`
- Páginas: `/src/app/(dashboard)/measurements/`

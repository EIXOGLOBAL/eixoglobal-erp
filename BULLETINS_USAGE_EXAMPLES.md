# Exemplos de Uso - Boletins de Medição

## 1. Listagem de Boletins

### Página Principal
Localização: `/src/app/(dashboard)/measurements/page.tsx`

```tsx
// Dados da página
const bulletins = await getMeasurementBulletins(undefined, companyId)
const projects = await prisma.project.findMany({...})

// Componentes renderizados
<BulletinsSummaryStats {...stats} />
<WorkflowPipeline {...counts} />
<MonthlySummaryChart data={monthlySummary} />
<BulletinsAdvancedStats bulletins={bulletins} />
<BulletinsTable data={bulletins} userId={userId} />
```

### Filtros e Busca
```tsx
// No BulletinsTable - Filtros internos
const [search, setSearch] = useState('')
const [statusFilter, setStatusFilter] = useState('ALL')
const [projectFilter, setProjectFilter] = useState('ALL')

// Aplicar filtros
const filtered = bulletins.filter(b => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
    if (projectFilter !== 'ALL' && b.project?.id !== projectFilter) return false
    if (search && !b.number.includes(search)) return false
    return true
})
```

## 2. Criação de Boletim

### Dialog de Criação
Localização: `/src/components/bulletins/create-bulletin-dialog.tsx`

```tsx
<CreateBulletinDialog
    projects={projects}
    userId={session.user?.id || ''}
/>

// Ao selecionar contrato, auto-popula itens:
const contractItems = await prisma.contractItem.findMany({
    where: { contractId: selectedContractId }
})

// Cria boletim com itens
const bulletin = await createMeasurementBulletin(userId, {
    projectId,
    contractId,
    referenceMonth: "01/2026",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    items: [] // Auto-popula se vazio
})
```

## 3. Detalhes e Edição

### Carregamento do Boletim
```tsx
// Server Component
const result = await getBulletinById(id)
const bulletin = result.data

// Renderizar header
<div className="text-2xl font-bold">
    {bulletin.number}
    <Badge variant={statusVariants[bulletin.status]}>
        {statusLabels[bulletin.status]}
    </Badge>
</div>
```

### Edição de Quantidades
```tsx
// Cliente - BulletinItemInlineEditor
<BulletinItemInlineEditor
    itemId={item.id}
    initialValue={item.currentMeasured}
    maxValue={item.contractedQuantity}
    onEditComplete={() => router.refresh()}
/>

// Ao salvar:
const result = await updateBulletinItem(itemId, newValue)

// Recalcula:
accumulatedMeasured = previousMeasured + newValue
balanceQuantity = contractedQuantity - accumulatedMeasured
currentValue = newValue × unitPrice
percentageExecuted = (accumulatedMeasured / contractedQuantity) × 100
```

### Componentes de Análise
```tsx
// Comparação
<BulletinComparisonPanel
    data={{
        currentBulletin: {
            value: totalValue,
            items: itemsWithValue.length,
            percentage: (totalValue / contractValue) × 100
        },
        accumulated: {
            value: previousTotalValue,
            items: itemsWithPrevious.length,
            percentage: (previousTotalValue / contractValue) × 100
        },
        balance: {
            value: contractValue - accumulatedValue,
            items: itemsWithBalance.length,
            percentage: ((contractValue - accumulatedValue) / contractValue) × 100
        },
        totalContract: contractValue
    }}
/>

// Execução do Contrato
<ContractExecutionChart
    contractValue={Number(bulletin.contract.value)}
    accumulatedValue={
        bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0)
    }
    currentValue={bulletin.totalValue}
    remainingValue={
        Number(bulletin.contract.value) -
        bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0)
    }
    executionPercentage={
        (bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0) /
        Number(bulletin.contract.value)) × 100
    }
/>

// Timeline
<BulletinTimeline
    createdAt={bulletin.createdAt}
    submittedAt={bulletin.submittedAt}
    approvedByEngineerAt={bulletin.approvedByEngineerAt}
    rejectedAt={bulletin.rejectedAt}
    billedAt={bulletin.billedAt}
    currentStatus={bulletin.status}
    rejectionReason={bulletin.rejectionReason}
/>
```

## 4. Workflow de Aprovação

### Envio para Aprovação
```tsx
// Client Component - BulletinActionButtons
async function handleSubmit() {
    const result = await submitBulletinForApproval(bulletin.id, userId)
    if (result.success) {
        toast({ title: "Boletim enviado para aprovação!" })
        router.refresh()
    }
}

// Status muda: DRAFT → PENDING_APPROVAL
// Notificações enviadas para ADMIN e MANAGER
```

### Aprovação com Comentário
```tsx
// Dialog abre para adicionar comentário (opcional)
async function handleApprove() {
    const result = await approveByEngineer({
        bulletinId: bulletin.id,
        comment: "Aprovado conforme especificações"
    }, userId)

    if (result.success) {
        // Status muda: PENDING_APPROVAL → APPROVED
        // Comment registrado com tipo "APPROVAL"
        // Timestamp approvedByEngineerAt registrado
        // Notificação enviada ao criador
        router.refresh()
    }
}
```

### Rejeição com Motivo
```tsx
// Dialog obriga motivo com mínimo 10 caracteres
async function handleReject() {
    const result = await rejectBulletin({
        bulletinId: bulletin.id,
        reason: "Quantidade do item 3 não corresponde à documentação fotográfica"
    }, userId)

    if (result.success) {
        // Status muda: PENDING_APPROVAL → REJECTED
        // Motivo armazenado em rejectionReason
        // Comment registrado com tipo "REJECTION"
        // Boletim volta para modo edição
        // Notificação com motivo enviada ao criador
        router.refresh()
    }
}
```

## 5. Comentários e Observações

### Adicionar Comentário
```tsx
// Client Component - CommentsSection
async function handleAddComment(text: string, type: 'OBSERVATION' | 'QUESTION') {
    const result = await addBulletinComment(
        bulletin.id,
        userId,
        { text, commentType: type }
    )

    if (result.success) {
        // Comment criado e exibido
        router.refresh()
    }
}

// Tipos disponíveis:
// - OBSERVATION: Observação geral
// - QUESTION: Pergunta sobre o boletim
// - APPROVAL: Comentário de aprovação (sistema)
// - REJECTION: Motivo rejeição (sistema)
```

### Comentários Internos
```tsx
// Para equipe interna (não visível ao cliente)
await addBulletinComment(
    bulletinId,
    userId,
    {
        text: "Aguardando documentação do cliente",
        commentType: 'OBSERVATION',
        isInternal: true
    }
)
```

## 6. Anexos

### Upload de Arquivo
```tsx
// Client Component - AttachmentUploader
async function handleUpload(file: File, description: string) {
    // 1. Enviar para API (presigned URL)
    const uploadResult = await fetch('/api/upload/bulletin', {
        method: 'POST',
        body: formData
    })

    const { fileUrl } = await uploadResult.json()

    // 2. Registrar no banco
    const result = await saveBulletinAttachment(
        bulletinId,
        userId,
        {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileUrl: fileUrl,
            description: "Foto do pilar central - 01/2026"
        }
    )
}

// Tipos suportados: JPEG, PNG, PDF
// Tamanho máximo: 10MB
```

### Deletar Anexo
```tsx
async function handleDeleteAttachment(attachmentId: string) {
    const result = await deleteBulletinAttachment(attachmentId)

    if (result.success) {
        // Arquivo deletado
        router.refresh()
    }
}
```

## 7. Impressão e PDF

### Rota de Impressão
Localização: `/measurements/[id]/print/page.tsx`

```tsx
// Server Component que busca dados
const result = await getBulletinById(id)
const bulletin = result.data

// Passa para client
<PrintBulletinClient
    bulletin={bulletin}
    company={company}
/>
```

### Componente de Impressão
```tsx
// Client Component - PrintBulletinClient
// Renderiza layout A4 otimizado
// Inclui:
// - Header com logo
// - Resumo do boletim
// - Tabela de itens
// - Valores totalizados
// - Espaço para assinaturas
// - Rodapé com auditoria

// Print: Ctrl+P ou Cmd+P para salvar em PDF
```

## 8. Estatísticas e Analytics

### Summary Stats
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

// Renderiza 8 cards com:
// - Total de boletins
// - Por status
// - Valores
// - Execução geral
```

### Advanced Stats
```tsx
<BulletinsAdvancedStats bulletins={bulletins} />

// Renderiza:
// - Pie Chart: Distribuição por status
// - Bar Chart: Valor por mês (últimos 6)
// - Cards: Valor médio por status
```

### Help Panel
```tsx
<BulletinsHelpPanel />

// Painel colapsível com:
// - Explicação do fluxo
// - Instruções por status
// - Dicas de uso
// - Links para documentação
```

## 9. Validações TypeScript

### Schema de Criação
```tsx
const createBulletinSchema = z.object({
    projectId: z.string().uuid(),
    contractId: z.string().uuid(),
    referenceMonth: z.string(), // "01/2026"
    periodStart: z.string(), // ISO date
    periodEnd: z.string(), // ISO date
    items: z.array(z.object({
        contractItemId: z.string().uuid(),
        currentMeasured: z.number().min(0),
        description: z.string().optional(),
    })),
})
```

### Schema de Rejeição
```tsx
const rejectBulletinSchema = z.object({
    bulletinId: z.string().uuid(),
    reason: z.string().min(10, "Mínimo 10 caracteres"),
})
```

### Schema de Comentário
```tsx
const comment = {
    text: z.string().min(3, "Mínimo 3 caracteres"),
    commentType: z.enum(['OBSERVATION', 'QUESTION', 'APPROVAL', 'REJECTION']),
    isInternal: z.boolean().optional(),
}
```

## 10. Notificações em Tempo Real

### SSE Notifications
```tsx
// Ao enviar para aprovação
notifyUsers(managerIds, {
    type: 'BULLETIN_SUBMITTED',
    title: 'Boletim enviado para aprovação',
    message: `Boletim ${bulletin.number} aguarda aprovação`,
    link: `/measurements/${bulletin.id}`,
})

// Ao aprovar
notifyUser(creatorId, {
    type: 'BULLETIN_APPROVED',
    title: 'Boletim aprovado',
    message: `Boletim ${bulletin.number} foi aprovado`,
    link: `/measurements/${bulletin.id}`,
})

// Ao rejeitar
notifyUser(creatorId, {
    type: 'BULLETIN_REJECTED',
    title: 'Boletim rejeitado',
    message: `Boletim ${bulletin.number} foi rejeitado: ${reason}`,
    link: `/measurements/${bulletin.id}`,
})
```

## 11. Casos de Uso Comuns

### Caso 1: Medição Simples
1. Criar novo boletim
2. Selecionar contrato (auto-popula itens)
3. Editar quantidades em linha
4. Anexar fotos da obra
5. Enviar para aprovação
6. Gerente aprova
7. Boletim pronto para faturamento

### Caso 2: Medição com Rejeição
1. Criar e enviar boletim
2. Gerente vê erro e rejeita
3. Criador recebe notificação com motivo
4. Corrige as quantidades
5. Reenvia para aprovação
6. Gerente aprova

### Caso 3: Análise de Execução
1. Gerente consulta listagem
2. Vê gráficos de distribuição
3. Clica em boletim para detalhes
4. Analisa execução do contrato
5. Verifica timeline de aprovação
6. Exporta para Excel ou PDF

### Caso 4: Comparativo de Períodos
1. Criar boletins para dois meses
2. Visualizar gráfico mensal
3. Comparar valores e quantidades
4. Identificar tendências
5. Gerar relatório

## Dicas de Implementação

### Performance
```tsx
// Use select() para buscar apenas campos necessários
const bulletin = await getBulletinById(id, {
    select: {
        id: true,
        number: true,
        items: { select: { ... } },
        // Não busque attachments/comments desnecessários
    }
})

// Revalidate seletivamente
revalidatePath(`/measurements/${id}`)
revalidatePath('/measurements')
```

### UX
```tsx
// Sempre mostrar carregamento
const [loading, setLoading] = useState(false)

// Toast com feedback
toast({ title: "Boletim enviado!" })

// Refresh após ação
router.refresh()

// Confirmar ações destrutivas
if (!confirm('Tem certeza?')) return
```

### Segurança
```tsx
// Sempre validar com Zod
const validated = schema.parse(data)

// Verificar permissões
if (user.role !== 'MANAGER') return unauthorized()

// Serializar Decimals
const item = {
    ...bulletinItem,
    unitPrice: Number(bulletinItem.unitPrice),
}
```

## Troubleshooting

### Problema: Quantidade não salva
- Verificar se boletim está em DRAFT ou REJECTED
- Validar que quantidade >= 0
- Confirmar resposta do servidor

### Problema: Botões de aprovação não aparecem
- Verificar userRole: deve ser ADMIN, MANAGER ou ENGINEER
- Verificar status: deve ser PENDING_APPROVAL
- Limpar cache do browser

### Problema: Gráficos não renderizam
- Verificar se há dados
- Confirmar Recharts importado
- Verificar altura do container (height={250})

### Problema: Notificações não chegam
- Verificar SSE connection ativa
- Validar userIds corretos
- Confirmar createNotification chamado

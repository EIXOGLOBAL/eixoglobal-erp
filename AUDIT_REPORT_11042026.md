# AUDITORIA TECNICA COMPLETA — ERP EIXO GLOBAL

**Data:** 11/04/2026
**Escopo:** 20 agentes paralelos auditando 826 arquivos-fonte
**Versao:** 11042026-02

---

## SUMARIO EXECUTIVO

| Severidade | Achados |
|------------|---------|
| CRITICA    | 32      |
| ALTA       | 45      |
| MEDIA      | 42      |
| BAIXA      | 30+     |

**Nota de saude:** 0 erros TypeScript, 0 imports quebrados, 0 imports circulares, 0 erros de sintaxe. Build limpo.

---

# NIVEL 1 — CRITICOS (Correcao Imediata)

## C01. markAsPaid SEMPRE incrementa saldo bancario (Bug financeiro)
- **Agente:** 17-Financial
- **Arquivo:** `src/app/actions/financial-actions.ts` linhas 197-219
- **Problema:** A funcao `markAsPaid()` usa `increment: finalPaidAmount` independente de INCOME/EXPENSE. Despesas PAGAS incrementam saldo em vez de decrementar. `registerPayment()` (linha 614) tem o mesmo bug.
- **Impacto:** Corrupcao silenciosa de saldos bancarios em producao.
- **Correcao:** `balance: { [record.type === 'EXPENSE' ? 'decrement' : 'increment']: finalPaidAmount }`

## C02. EVM fabrica dados ficticios (Viola regra MASTER)
- **Agente:** 18-Engineering
- **Arquivo:** `src/app/actions/evm-actions.ts` linhas 79, 82, 393
- **Problema:** Quando nao ha boletins aprovados, `EV = PV * 0.9`. Quando nao ha custo real, `AC = EV * 1.05`. Curva S usa `AC = EV * 1.05` (markup fixo). Gera CPI/SPI ficticios para projetos sem dados reais.
- **Impacto:** Decisoes baseadas em indicadores falsos. Viola frontalmente "nunca dados mock/fake".
- **Correcao:** Retornar EV=0, AC=0 quando sem dados. Sinalizar ao frontend "dados insuficientes".

## C03. Medicoes podem ultrapassar 100% do contratado
- **Agente:** 18-Engineering
- **Arquivo:** `src/app/actions/bulletin-actions.ts` linhas 136-170, 832-886
- **Problema:** Nenhuma validacao impede `accumulatedMeasured > contractedQuantity`. `percentageExecuted` pode ser >100%, `balanceQuantity` pode ser negativo.
- **Impacto:** Pagamento acima do valor contratual. Inconsistencia grave em engenharia civil.
- **Correcao:** Validar `if (newAccumulated > contracted) return error`. Flag opcional para excedente justificado.

## C04. Aditivos contratuais sem limite legal de 25%
- **Agente:** 18-Engineering
- **Arquivo:** `src/app/actions/contract-actions.ts` linhas 505-592
- **Problema:** `createAmendment` aceita qualquer valor sem verificar limite de 25% (Lei 14.133/2021 Art. 125) ou 50% para reformas.
- **Impacto:** Nao-conformidade legal para contratos publicos.
- **Correcao:** Para `contractType: 'PUBLIC'`, calcular percentual e rejeitar se >25%.

## C05. Sem middleware.ts — rotas desprotegidas
- **Agente:** 02-Auth + 03-API
- **Arquivo:** Nao existe `src/middleware.ts`
- **Problema:** Nenhuma protecao centralizada de rotas. Autenticacao depende de cada action chamar `assertAuthenticated()` individualmente. Esquecimentos = rotas abertas.
- **Impacto:** Bypass total de auth em qualquer rota que esqueca a verificacao.
- **Correcao:** Criar `middleware.ts` com whitelist de rotas publicas.

## C06. /api/admin/fix-schema e /api/admin/reset-users publicos
- **Agente:** 03-API
- **Arquivo:** `src/proxy.ts` (PUBLIC_PATHS)
- **Problema:** Endpoints admin criticos estao na lista de rotas publicas. Qualquer pessoa pode executar DDL no banco ou resetar senhas de usuarios.
- **Impacto:** Acesso total ao banco de dados e contas de usuarios.
- **Correcao:** Remover de PUBLIC_PATHS. Proteger com CRON_SECRET ou Bearer token.

## C07. DEV_LOGIN_ENABLED=true em producao
- **Agente:** 12-Docker
- **Arquivo:** `docker-compose.yml`
- **Problema:** `DEV_LOGIN_ENABLED: "true"` hardcoded. Permite login sem senha em producao.
- **Impacto:** Qualquer pessoa acessa o sistema sem credenciais.
- **Correcao:** Remover ou setar como `false`. Usar env var do Dokploy.

## C08. API key Anthropic no .env e chaves em plaintext no banco
- **Agente:** 19-AI + 13-Secrets
- **Arquivo:** `.env` linha 14 / `system_settings` tabela
- **Problema:** `sk-ant-api03-kWZOg-...` em texto puro no disco. Chaves no banco sem criptografia.
- **Impacto:** Qualquer acesso ao servidor/banco expoe todas as API keys.
- **Correcao:** Revogar chave atual. Criptografar com AES-256-GCM. Usar secret manager.

## C09. Senha 123456 hardcoded em reset-users
- **Agente:** 13-Secrets
- **Arquivo:** `src/app/api/admin/reset-users/route.ts`
- **Problema:** Reseta senhas de todos os usuarios para "123456". Combinado com C06 (endpoint publico), qualquer pessoa pode resetar todas as senhas.
- **Impacto:** Comprometimento total de todas as contas.
- **Correcao:** Remover endpoint ou proteger com token forte + gerar senhas aleatorias.

## C10. Senha eixo2026 em .env.example (commitado)
- **Agente:** 13-Secrets
- **Arquivo:** `.env.example`
- **Problema:** Senha real do banco commitada no repositorio.
- **Correcao:** Substituir por placeholder. Rotacionar senha do banco.

## C11. Server actions sem autenticacao
- **Agente:** 02-Auth
- **Arquivos:** `project-actions.ts`, `contract-actions.ts`, `notification-preferences-actions.ts`
- **Problema:** Funcoes exportadas como server actions sem `assertAuthenticated()`.
- **Impacto:** Acesso nao-autenticado a dados de projetos e contratos.
- **Correcao:** Adicionar `await assertAuthenticated()` no inicio de cada funcao.

## C12. Cross-tenant data leak em supplier-actions
- **Agente:** 02-Auth
- **Arquivo:** `src/app/actions/supplier-actions.ts`
- **Problema:** Aceita `companyId` arbitrario do frontend sem verificar contra sessao do usuario.
- **Impacto:** Usuario de empresa A pode acessar fornecedores da empresa B.
- **Correcao:** Usar `assertCompanyAccess(companyId)` em todas as funcoes.

## C13. Sem .dockerignore — .env e .git vazam no build
- **Agente:** 12-Docker
- **Problema:** Sem `.dockerignore`, `COPY . .` inclui `.env`, `.git/`, `node_modules/` na imagem Docker.
- **Impacto:** Credenciais na imagem Docker. Imagem inflada.
- **Correcao:** Criar `.dockerignore` com `.env`, `.git`, `node_modules`, `*.md`.

## C14. N+1 queries criticas no notification-scheduler
- **Agente:** 07-Database
- **Arquivo:** `src/lib/notification-scheduler.ts` linhas 168-603
- **Problema:** `checkCostCenterBudgetOverruns()`, `checkLowStockMaterials()`, `checkSystemHealth()`, `checkDataIntegrity()` fazem queries individuais por item em loops. 50 budgets = ~150 queries extras.
- **Impacto:** Degradacao exponencial de performance com crescimento de dados.
- **Correcao:** Batch-fetch com groupBy/aggregate. Pre-buscar adminIds e notificacoes do dia.

## C15. findMany sem paginacao em fraud-detection
- **Agente:** 07-Database
- **Arquivo:** `src/lib/fraud-detection.ts` linhas 24, 106, 141, 170, 281
- **Problema:** 5 funcoes carregam TODOS os registros (financialRecord, timeEntry, material, contract) sem take/skip.
- **Impacto:** Out of memory com volume de dados real.
- **Correcao:** Usar aggregate/groupBy no banco. Filtrar direto na query.

## C16. Cascade delete Company destroi AuditLog
- **Agente:** 01-Schema
- **Arquivo:** `prisma/schema.prisma`
- **Problema:** `Company` -> `AuditLog` com cascade delete. Deletar empresa apaga trilha de auditoria.
- **Impacto:** Destruicao de evidencia de auditoria. Problemas legais/compliance.
- **Correcao:** Alterar para `onDelete: SetNull` ou `Restrict`.

## C17. sanitize.ts nunca importado
- **Agente:** 04-Validation
- **Arquivo:** `src/lib/sanitize.ts` (553 linhas)
- **Problema:** Modulo de sanitizacao completo existe mas NENHUMA server action o importa.
- **Impacto:** Inputs do usuario vao direto ao banco sem sanitizacao (XSS, SQL injection via campos texto).
- **Correcao:** Importar e aplicar `sanitize()` em todos os campos de texto livre nas server actions.

## C18. CSRF implementado mas nunca chamado
- **Agente:** 03-API
- **Problema:** Funcoes de CSRF existem mas nao sao usadas em nenhum endpoint.
- **Impacto:** Protecao contra CSRF inexistente.
- **Correcao:** Integrar verificacao CSRF nos endpoints de mutacao.

## C19. Prompt injection no endpoint de chat IA
- **Agente:** 19-AI
- **Arquivo:** `src/app/api/ai/chat/route.ts` linhas 56-120
- **Problema:** Input do usuario enviado diretamente para IA sem filtragem. Campo `context` serializado sem validacao de tamanho/conteudo.
- **Impacto:** Exfiltracao de dados via manipulacao de prompt. Custos inflados.
- **Correcao:** Filtrar padroes de injection. Limitar tamanho. Validar `context` com Zod.

## C20. 99 relacoes Prisma sem onDelete explicito
- **Agente:** 01-Schema
- **Arquivo:** `prisma/schema.prisma`
- **Problema:** 99 relacoes usam o default (Cascade ou SetNull dependendo de nulabilidade) sem definicao explicita.
- **Impacto:** Delecoes em cascata inesperadas ou erros de FK ao deletar registros.
- **Correcao:** Definir `onDelete` explicito em todas as relacoes conforme regra de negocio.

## C21. closeBilling() e emitFiscalNote() sem transacao atomica
- **Agente:** 07-Database
- **Arquivo:** `src/services/billing.ts` linhas 9-58, 64-118
- **Problema:** `closeBilling()` faz create(fiscalNote) + updateMany(measurements) separados. `emitFiscalNote()` faz update(fiscalNote) + create(financialRecord) + updateMany(measurements) separados. Falha no meio = dados inconsistentes.
- **Impacto:** Nota fiscal criada sem medicoes atualizadas. Registro financeiro criado sem nota fiscal vinculada.
- **Correcao:** Envolver em `prisma.$transaction()`.

## C22. Vazamento cross-tenant em schedulers (sem companyId)
- **Agente:** 07-Database
- **Arquivos:** `src/lib/email-scheduler.ts` L63,72 / `src/lib/notification-scheduler.ts` L170,208,280
- **Problema:** Queries de supplierDocument, equipmentDocument, equipmentMaintenance, e material buscam registros de TODAS as empresas sem filtro companyId.
- **Impacto:** Notificacoes de documentos/manutencoes enviadas para empresas erradas.
- **Correcao:** Adicionar filtro `{ supplier: { companyId } }` ou equivalente em cada query.

## C23. Vazamento cross-tenant em deletes (allocation, user, equipment)
- **Agente:** 07-Database
- **Arquivos:** `project-actions.ts` L366 / `user-actions.ts` L265 / `equipment-actions.ts` L195
- **Problema:** `deleteAllocation`, `deleteUser`, `deleteEquipment` deletam por ID sem verificar companyId. Admin de empresa A pode deletar registros de empresa B.
- **Impacto:** Destruicao de dados de outras empresas.
- **Correcao:** Verificar companyId antes de cada delete.

## C24. getSalaryHistory sem verificacao de companyId
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/employee-actions.ts` L626
- **Problema:** Qualquer usuario autenticado acessa historico salarial de funcionarios de qualquer empresa.
- **Impacto:** Vazamento de dados salariais confidenciais.
- **Correcao:** Verificar que employee.companyId == session.companyId.

---

# NIVEL 2 — ALTOS (Correcao em 1-2 semanas)

## A01. strict: false no tsconfig — ~300+ any
- **Agente:** 06-TypeScript
- **Arquivo:** `tsconfig.json`
- **Correcao:** Ativar incrementalmente: `noImplicitAny` primeiro, depois `strictNullChecks`.

## A02. DRE usa estimativas hardcoded em vez de dados reais
- **Agente:** 17-Financial
- **Arquivo:** `src/lib/financial-reports.ts` linhas 241-339
- **Problema:** Deducoes=10% fixo, Pessoal anterior=90%, Depreciacao=2%, Impostos=15%.
- **Correcao:** Buscar dados reais de BDIConfig/tributacao da empresa.

## A03. DRE filtra por dueDate em vez de competencia/caixa
- **Agente:** 17-Financial
- **Arquivo:** `src/lib/financial-reports.ts` linhas 150-170
- **Correcao:** Adicionar opcao de regime contabil (competencia vs caixa).

## A04. generateBillingNumber tem race condition
- **Agente:** 17-Financial
- **Arquivo:** `src/app/actions/billing-actions.ts` linhas 39-52
- **Correcao:** Envolver em `$transaction` com isolation serializable + unique constraint.

## A05. deleteFinancialRecord nao reverte saldo bancario
- **Agente:** 17-Financial
- **Arquivo:** `src/app/actions/financial-actions.ts` linhas 236-265
- **Correcao:** Antes de deletar, reverter saldo se status=PAID.

## A06. Nota Fiscal aceita valor zero
- **Agente:** 17-Financial
- **Arquivo:** `src/app/actions/fiscal-note-actions.ts` linha 24
- **Correcao:** `.min(0.01, "Valor deve ser maior que zero")`

## A07. financial-schedule-actions sem audit log
- **Agente:** 17-Financial
- **Arquivo:** `src/app/actions/financial-schedule-actions.ts`
- **Correcao:** Adicionar logCreate/logUpdate/logDelete.

## A08. RDO nao valida data futura
- **Agente:** 18-Engineering
- **Arquivo:** `src/app/actions/daily-report-actions.ts` linhas 19-27
- **Correcao:** `.refine((d) => new Date(d.date) <= new Date())`

## A09. Incidentes CRITICAL nao geram notificacao
- **Agente:** 18-Engineering
- **Arquivo:** `src/app/actions/safety-actions.ts` linhas 74-135
- **Correcao:** Notificar ADMIN+MANAGER+ENGINEER para severidade CRITICAL/HIGH.

## A10. safety-actions usa campo `score` que nao existe
- **Agente:** 18-Engineering
- **Arquivo:** `src/app/actions/safety-actions.ts` linha 475
- **Problema:** `i.score` deveria ser `i.overallScore`.
- **Correcao:** Alterar para campo correto do schema.

## A11. XSS em relatorio HTML baixado da IA
- **Agente:** 19-AI
- **Arquivo:** `src/app/(dashboard)/ia/_components/report-generator-panel.tsx` linhas 100-153
- **Correcao:** Sanitizar `report.content` com DOMPurify antes do download.

## A12. Prompt injection via campo context do chat
- **Agente:** 19-AI
- **Arquivo:** `src/app/api/ai/chat/route.ts` linhas 60, 95
- **Correcao:** Validar context com Zod, limitar tamanho a 1KB.

## A13. Dados financeiros no contexto IA sem filtro por role
- **Agente:** 19-AI
- **Arquivo:** `src/lib/ai/chat-context.ts` linhas 64-159
- **Correcao:** Aplicar filtro de dados por userRole em getFinancialContext().

## A14. Project.budget sem @db.Decimal
- **Agente:** 17-Financial
- **Arquivo:** `prisma/schema.prisma` linha 334
- **Correcao:** `budget Decimal? @db.Decimal(18, 4)`

## A15. Float para ApprovalLevel.minAmount/maxAmount
- **Agente:** 01-Schema
- **Arquivo:** `prisma/schema.prisma`
- **Correcao:** Usar `Decimal @db.Decimal(18,4)`.

## A16. Stack traces Prisma expostos ao cliente
- **Agente:** 04-Validation
- **Problema:** Erros Prisma com stack trace retornados em responses.
- **Correcao:** Logar servidor, retornar mensagem generica ao client.

## A17. react-leaflet com licenca Hippocratic (nao OSI)
- **Agente:** 14-Dependencies
- **Correcao:** Avaliar alternativa (maplibre-gl) ou consultar juridico.

## A18. Recharts (~300KB) e XLSX (~1MB) no client bundle
- **Agente:** 15-Performance
- **Correcao:** Lazy load com `dynamic(() => import(...), { ssr: false })`.

## A19. findMany sem paginacao em financial-reports
- **Agente:** 07-Database
- **Arquivo:** `src/lib/financial-reports.ts` linhas 149-758
- **Problema:** DRE, cashflow, cost-center carregam tudo na memoria.
- **Correcao:** Usar aggregate/groupBy no banco.

## A20. findMany sem paginacao em billing-actions
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/billing-actions.ts` linhas 180, 216
- **Correcao:** Adicionar skip/take. Usar aggregate para sumarios.

## A21. 80+ botoes icon-only sem aria-label
- **Agente:** 20-Accessibility
- **Arquivos:** Multiplos (purchase-orders-table, contractors-table, equipment-table, employees-table, etc.)
- **Correcao:** Adicionar aria-label descritivo em todos os botoes size="icon".

## A22. text-gray-400 sobre fundo branco em impressoes
- **Agente:** 20-Accessibility
- **Arquivos:** print-employee-client, print-trainings-client, print-bulletin-client, print-contract-client
- **Problema:** Ratio ~2.7:1, abaixo do minimo 4.5:1 WCAG AA.
- **Correcao:** Trocar para text-gray-500 ou text-gray-600.

## A23. 0/67 server actions testadas
- **Agente:** 16-Testing
- **Problema:** 1.2% test coverage. 10 arquivos de teste para 816 de codigo.
- **Correcao:** Priorizar testes em financeiro (markAsPaid, BDI) e auth.

## A24. 37 componentes com >300 linhas (6 com >1000)
- **Agente:** 10-Components
- **Arquivo:** reconciliation-client (1514), dashboard-content (1205), supplier-detail (1187), schedule-client (1129), ReportTemplate (1109), cost-center-budget (1031)
- **Correcao:** Extrair sub-componentes. Usar composicao.

## A25. Transacoes ausentes em project-actions (status + historico)
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/project-actions.ts` linhas 115-158, 374-398
- **Problema:** `updateProject()` e `changeProjectStatus()` fazem update + create(statusHistory) separados.
- **Correcao:** Envolver em `prisma.$transaction()`.

## A26. Transacao ausente em updateEmployee (salary history)
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/employee-actions.ts` linhas 149-189
- **Problema:** `employee.update()` e `salaryHistory.create()` separados (createEmployee usa $transaction corretamente).
- **Correcao:** Envolver em `prisma.$transaction()`.

## A27. Transacoes ausentes em billing-actions (create/delete)
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/billing-actions.ts` linhas 71-94, 330-338
- **Problema:** `createBilling` e `deleteBilling` fazem billing + bulletinUpdate separados.
- **Correcao:** Envolver em `prisma.$transaction()`.

## A28. deleteCompany verifica apenas projects, ignora outras relacoes
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/company-actions.ts` linha 204
- **Problema:** Nao verifica users, employees, clients, suppliers, financialRecords, equipment, contracts.
- **Correcao:** Verificar todas as relacoes principais ou usar soft delete.

## A29. deleteCostCenter nao verifica financialRecords vinculados
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/cost-center-actions.ts` linha 118
- **Correcao:** Verificar `prisma.financialRecord.count({ where: { costCenterId: id } })`.

## A30. deleteBankAccount nao verifica registros vinculados
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/financial-actions.ts` linha 483
- **Correcao:** Verificar financialRecords e bankStatements antes de deletar.

## A31. createAllocation nao verifica companyId do project/employee
- **Agente:** 07-Database
- **Arquivo:** `src/app/actions/project-actions.ts` linhas 340-362
- **Correcao:** Validar que projectId e employeeId pertencem ao companyId do usuario.

---

# NIVEL 3 — MEDIOS (Correcao em 1 mes)

## M01. Conversao Decimal->Number() em somas financeiras
- **Agente:** 17-Financial
- **Correcao:** Somas criticas via SQL SUM() no banco ou decimal.js.

## M02. BDI simplificado vs formula TCU em composicoes
- **Agente:** 18-Engineering
- **Correcao:** Permitir composicoes referenciarem BDIConfig.

## M03. Dependencias cronograma armazenadas mas nao enforced
- **Agente:** 18-Engineering
- **Correcao:** Implementar propagacao de datas.

## M04. Orçado vs Realizado usa distribuicao proporcional
- **Agente:** 18-Engineering
- **Correcao:** Vincular registros financeiros a itens especificos.

## M05. updateDailyReport nao valida duplicata de data
- **Agente:** 18-Engineering
- **Correcao:** Verificar unicidade antes do update.

## M06. Rate limiting em memoria (nao persistente)
- **Agente:** 19-AI
- **Correcao:** Migrar para Redis ou adicionar cleanup periodico.

## M07. Historico chat IA nao persistido
- **Agente:** 19-AI
- **Correcao:** Persistir no banco para auditoria.

## M08. Consumo de tokens IA sem persistencia
- **Agente:** 19-AI
- **Correcao:** Criar tabela ai_usage_log.

## M09. toggleCostCenterStatus sem verificar companyId
- **Agente:** 17-Financial
- **Correcao:** Adicionar assertCompanyAccess().

## M10. Auto-reconciliacao sem transacao atomica
- **Agente:** 17-Financial
- **Correcao:** Envolver em prisma.$transaction().

## M11. updateBankAccount permite sobrescrever saldo
- **Agente:** 17-Financial
- **Correcao:** Remover balance do schema update ou adicionar audit log.

## M12. reconcileRecord sem atomicidade
- **Agente:** 17-Financial
- **Correcao:** Envolver em $transaction.

## M13. Sem limite maximo de valor nos schemas Zod
- **Agente:** 17-Financial
- **Correcao:** Adicionar .max() razoavel.

## M14. 20+ useState em reconciliation-client
- **Agente:** 10-Components
- **Correcao:** Usar useReducer ou hooks customizados.

## M15. useEffect sem AbortController em global-search
- **Agente:** 10-Components
- **Correcao:** Adicionar AbortController.

## M16. Prompts IA hardcoded sem versionamento
- **Agente:** 19-AI
- **Correcao:** Armazenar em system_settings com fallback.

## M17. N+1 queries em email-scheduler
- **Agente:** 07-Database
- **Correcao:** Pre-buscar admins em batch.

## M18. Reajuste contratual sem historico por item
- **Agente:** 18-Engineering
- **Correcao:** Criar snapshot de precos antigos.

## M19. Inputs de busca sem aria-label
- **Agente:** 20-Accessibility
- **Correcao:** Adicionar aria-label em todos os campos de busca.

## M20. Forms fora do react-hook-form sem labels
- **Agente:** 20-Accessibility
- **Correcao:** Adicionar htmlFor/aria-label.

---

# NIVEL 4 — BAIXOS (Backlog)

- **B01.** bankAccountSchema.balance aceita negativo sem decisao explicita
- **B02.** Arredondamento BDI com float JavaScript (edge case)
- **B03.** textSimilarity na conciliacao usa Jaccard simples
- **B04.** Arquivos duplicados: test-login e debug-login (identicos, 7 linhas cada)
- **B05.** 4 hooks nao utilizados (281 linhas)
- **B06.** 2 skeletons nao usados (88 linhas)
- **B07.** vitest.d.ts com apenas 1 linha
- **B08.** Codigo legado Anthropic com modelos hardcoded
- **B09.** Discrepancia entre limites de rate limit documentados e implementados
- **B10.** Stream legado OpenRouter sem timeout
- **B11.** Sem rotacao automatica de API keys
- **B12.** startDate < endDate nao validado em tasks
- **B13.** Imagens com alt="Logo" generico em impressoes
- **B14.** Projecao de fluxo de caixa arredonda com Math.round

---

# DEAD CODE — Limpeza Recomendada

| Categoria | Arquivos | Linhas |
|-----------|----------|--------|
| Lib files mortos | 12 | 2.954 |
| Actions nao usadas | 11 | 2.141 |
| Hooks nao usados | 4 | 281 |
| Componentes UI mortos | 15 | 1.923 |
| Componentes negocio mortos | 23 | 3.518 |
| API routes nao referenciadas | 16 | 1.617 |
| Skeletons nao usados | 2 | 88 |
| **TOTAL** | **83** | **~12.536** |

**Top 5 maiores dead code files:**
1. `src/lib/validation-schemas.ts` — 569 linhas (NUNCA importado)
2. `src/components/ui/file-or-link-attachment.tsx` — 507 linhas
3. `src/components/contracts/contracts-page-content.tsx` — 495 linhas
4. `src/lib/bank-statement-parser.ts` — 315 linhas (versao antiga)
5. `src/components/settings/company-logo-upload.tsx` — 313 linhas

---

# PONTOS POSITIVOS IDENTIFICADOS

- **Build limpo:** 0 erros TypeScript, 0 imports quebrados
- **Formula BDI/TCU correta** (Acordao 2.622/2013)
- **Workflow de boletins robusto** com segregacao de funcoes
- **Conciliacao bancaria em 5 niveis** com confidence scoring
- **Fallback multi-provider IA** com 3 providers + 8+ modelos
- **Streaming IA com timeout** no novo client (30s AbortSignal)
- **Chat principal seguro** contra XSS (ReactMarkdown + texto puro)
- **API keys nao expostas ao client** (tudo server-side)
- **Path alias @/ 100% consistente** (373 caminhos resolvem)
- **RDO com constraint unique** date+projectId
- **Duplicata de RDO validada** no create
- **Paginacao bem implementada** em varios modules (financial, employees)
- **Audit logging** implementado na maioria das actions

---

# PLANO DE CORRECAO SUGERIDO

## Sprint 1 (Urgente — esta semana)
1. C01: Corrigir markAsPaid (bug financeiro ativo)
2. C02: Remover dados ficticios do EVM
3. C06: Proteger endpoints admin
4. C07: Desativar DEV_LOGIN
5. C09: Remover/proteger reset-users
6. C13: Criar .dockerignore

## Sprint 2 (Seguranca — proxima semana)
7. C05: Criar middleware.ts
8. C08: Criptografar API keys
9. C11: Adicionar auth em actions
10. C12+C22+C23+C24: Validar companyId em todos os endpoints (cross-tenant)
11. C17: Integrar sanitize.ts
12. C19: Proteger chat IA contra injection

## Sprint 3 (Engenharia + Transacoes — semana 3)
13. C03: Validar limite 100% em medicoes
14. C04: Validar limite 25% em aditivos
15. C21+A25-A27: Transacoes atomicas (billing, project, employee)
16. A02-A03: Corrigir DRE
17. A04-A05: Race condition billing + reverter saldo
18. A08: Validar data futura RDO
19. A09-A10: Notificacoes seguranca + campo correto
20. A28-A30: Verificar dependencias antes de deletes

## Sprint 4 (Performance + UX — semana 4)
21. C14-C15: Otimizar N+1 e findMany
22. A18: Lazy load Recharts/XLSX
23. A21-A22: Acessibilidade
24. Dead code cleanup (~12.500 linhas)

---

**Gerado por 20 agentes de auditoria paralelos em 11/04/2026**

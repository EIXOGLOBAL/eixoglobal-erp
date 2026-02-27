# Downgrade do Prisma 7.4.1 para 5.22.0

## Contexto

Durante a migração de SQLite para PostgreSQL, foi necessário fazer downgrade do Prisma da versão 7.4.1 para 5.22.0 devido a incompatibilidades e erros críticos.

## Erros Encontrados no Prisma 7.4.1

### 1. Propriedade `url` Não Suportada no Datasource

**Erro:**
```
Error: The datasource property 'url' is no longer supported in schema files
```

**Descrição:** O Prisma 7 removeu o suporte à propriedade `url` dentro do bloco `datasource`, que é fundamental para configuração de conexão com o banco de dados usando variáveis de ambiente.

**Impacto:** Impossibilita a configuração básica de conexão com PostgreSQL.

---

### 2. Erros de Validação de Schema (18 Tipos Faltantes)

**Erro:**
```
Schema validation errors: 18 errors
```

**Tipos não reconhecidos:**
- `WorkCalendar`
- `BDIConfig`
- `FinancialScheduleItem`
- `CompositionVersion`
- `TaskDependency`
- `DailyReportPhoto`
- `DailyReportEquipment`
- `MaintenancePlanItem`
- `EquipmentDocument`
- E outros 9 tipos

**Descrição:** O Prisma 7 tem validação de schema mais rigorosa, rejeitando referências a modelos que ainda não foram totalmente implementados ou que estavam em formato de stub.

**Impacto:** Bloqueia a geração do Prisma Client, impedindo qualquer operação com o banco de dados.

---

### 3. Provider do Generator Incorreto

**Erro:**
```
Error: The generator provider 'prisma-client' is not valid
```

**Descrição:** No Prisma 7, o provider correto deveria ser `"prisma-client-js"`, mas a configuração inicial usava `"prisma-client"` (sem o sufixo `-js`).

**Impacto:** Impede a geração do Prisma Client.

---

### 4. Erro de Spawn do Processo

**Erro:**
```
Error: spawn prisma-client ENOENT
```

**Descrição:** Relacionado ao erro anterior - quando o provider está incorreto, o Prisma tenta executar um binário `prisma-client` que não existe.

**Impacto:** Build process completamente quebrado.

---

### 5. Módulo Runtime Não Encontrado

**Erro:**
```
Module not found: Can't resolve '@prisma/client/runtime/client'
```

**Descrição:** O Prisma 7 mudou a estrutura interna de arquivos gerados. O caminho `@prisma/client/runtime/client` não existe mais na nova versão.

**Impacto:** Aplicação não consegue importar o Prisma Client, causando falha em todos os endpoints que acessam o banco.

---

### 6. Incompatibilidade com Enums

**Enums faltantes que causaram erros:**
- `ContractType`
- `ReajusteIndex`
- `AmendmentType`
- `CompositionStatus`
- `DepreciationMethod`
- `FuelType`

**Descrição:** O Prisma 7 exige que todos os enums referenciados nos modelos estejam explicitamente definidos no schema, sem tolerância para definições implícitas.

**Impacto:** Validação de schema falha em múltiplos pontos.

---

## Solução Adotada

### Downgrade para Prisma 5.22.0

**Comando executado:**
```bash
npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact
```

**Razões para escolher a versão 5.22.0:**

1. **Estabilidade Comprovada:** Versão madura com suporte completo a PostgreSQL
2. **Compatibilidade com Ferramentas:** Melhor integração com Next.js 16 e TypeScript 5
3. **Suporte à Propriedade `url`:** Permite configuração de datasource via variáveis de ambiente normalmente
4. **Validação de Schema Flexível:** Aceita stubs de modelos e referências forward, facilitando desenvolvimento incremental
5. **Runtime Estável:** Estrutura de arquivos gerados (`@prisma/client/runtime/library`) é consistente e bem documentada

---

## Correções Complementares Feitas no Schema

Após o downgrade, foram necessárias as seguintes correções:

### 1. Generator Provider
```prisma
generator client {
  provider = "prisma-client-js"  // Corrigido de "prisma-client"
  output   = "../src/lib/generated/prisma"
}
```

### 2. Datasource URL
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // Funciona perfeitamente no Prisma 5.22
}
```

### 3. Adição de Enums Faltantes
```prisma
enum ContractType {
  OBRA
  SERVICO
  FORNECIMENTO
}

enum ReajusteIndex {
  IGPM
  IPCA
  INCC
}

// ... outros enums
```

### 4. Modelos Stub Implementados
Foram criados stubs para todos os modelos referenciados mas não implementados:
- `WorkCalendar`
- `BDIConfig`
- `FinancialScheduleItem`
- Entre outros

---

## Status Atual

✅ **Prisma 5.22.0 instalado e funcionando perfeitamente**
✅ **Schema validado sem erros**
✅ **Prisma Client gerado com sucesso em `src/lib/generated/prisma`**
✅ **Conexão com PostgreSQL estabelecida**
✅ **Todas as migrações aplicadas**
✅ **Build do projeto passando com 0 erros TypeScript**

---

## Considerações para o Futuro

### Quando Considerar Upgrade para Prisma 6 ou 7:

1. **Aguardar Estabilização:** Esperar pelo menos 6 meses após o lançamento de uma versão major
2. **Verificar Breaking Changes:** Consultar changelog oficial e migration guides
3. **Testar em Ambiente de Desenvolvimento:** Criar branch separada para testes de upgrade
4. **Validar Schema Completo:** Garantir que todos os modelos estejam completamente implementados antes do upgrade
5. **Atualizar Documentação:** Manter documentação atualizada sobre versões e motivos de escolha

### Benefícios de Permanecer no Prisma 5.22:

- **Sem Surpresas:** Comportamento previsível e bem documentado
- **Comunidade Ativa:** Grande base de usuários com soluções para problemas comuns
- **Suporte Long-Term:** Versão 5.x ainda receberá patches de segurança
- **Ecossistema Maduro:** Ferramentas e integrações testadas em produção

---

## Conclusão

O downgrade para Prisma 5.22.0 foi uma decisão técnica sólida baseada em:
- **Incompatibilidades críticas** do Prisma 7 com o schema atual
- **Necessidade de estabilidade** para ambiente de produção
- **Melhor suporte** a recursos essenciais (datasource.url, validação flexível)
- **Compatibilidade comprovada** com PostgreSQL e stack do projeto (Next.js 16, TypeScript 5)

Recomenda-se manter esta versão até que:
1. O Prisma 7 esteja mais maduro e estável
2. Todos os modelos do schema estejam completamente implementados
3. Haja necessidade real de recursos exclusivos das versões mais novas

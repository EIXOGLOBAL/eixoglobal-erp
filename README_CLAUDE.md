# 🏗️ ERP Eixo Global - Guia para Continuidade no Claude Code

Este projeto é um ERP completo focado em **Gestão de Obras e Medições**, desenvolvido com Next.js 16, Prisma, SQLite e Shadcn UI.

---

## 🚀 **Como Configurar e Rodar o Projeto**

### 1. **Instalação**
```bash
npm install
```

### 2. **Banco de Dados (SQLite)**
O projeto está configurado para usar SQLite local (`dev.db`). Para rodar as migrações e gerar o cliente Prisma:

```bash
# Gerar o Prisma Client
npx prisma generate

# Aplicar o schema ao banco de dados SQLite
npx prisma db push
```

### 3. **Rodar o Servidor**
```bash
npm run dev
```
O sistema estará disponível em: `http://localhost:3000`

---

## 📂 **Arquitetura do Projeto**

### **Stack Tecnológica**
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn UI through Lucide Icons.
- **Backend**: Server Actions (Next.js), Zod (Validação).
- **Database**: SQLite (dev) / PostgreSQL (prod ready), Prisma ORM.
- **Charts**: Recharts.

### **Estrutura de Pastas**
- `src/app`: Rotas e páginas (App Router).
- `src/app/actions`: Server Actions (Lógica de Backend).
  - `bulletin-actions.ts`: Lógica de Boletins de Medição.
  - `project-actions.ts`: Lógica de Projetos.
  - `company-actions.ts`: Lógica de Empresas.
- `src/components`: Componentes React reutilizáveis.
- `prisma/schema.prisma`: Definição do banco de dados.

---

## ✅ **Funcionalidades Implementadas**

### 1. **Módulo de Projetos**
- CRUD completo.
- Status: `PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`, `CANCELLED`.
- Detalhes com equipe, contratos e medições.

### 2. **Módulo de Contratos (Enterprise)**
- Schema profissional com Termos Aditivos (`ContractAmendment`) e Reajustes (`ContractAdjustment`).
- Controle de vigência e saldo.

### 3. **Módulo de Medições (Enterprise)**
- Boletim de Medição (`MeasurementBulletin`) com workflow de aprovação completo.
- Status: `DRAFT` → `PENDING_APPROVAL` → `APPROVED` / `REJECTED` → `BILLED`.
- Cálculo automático de saldos e acumulados.

### 4. **Dashboard Executivo**
- KPIs em tempo real.
- Gráficos de performance (Recharts).

---

## 🚧 **Próximos Passos (Para Continuar)**

1.  **Frontend de Boletins de Medição**:
    - A página de listagem (`src/app/(dashboard)/measurements/page.tsx`) e a tabela (`BulletinsTable`) estão criadas.
    - **Falta criar**: A página de detalhes/edição do boletim (`src/app/(dashboard)/measurements/[id]/page.tsx`) para permitir adicionar itens e anexos.

2.  **Frontend de Contratos**:
    - Criar interface para gerenciar Termos Aditivos e Reajustes.

3.  **Módulo de Custos**:
    - Criar interface para Composições de Custos (`CostComposition`).

---

## 📝 **Variáveis de Ambiente (.env)**
```env
DATABASE_URL="file:./dev.db"
```

Use este guia como ponto de partida para continuar o desenvolvimento no Claude Code.

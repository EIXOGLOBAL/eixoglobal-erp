# Estrutura do Sistema ERP Eixo Global - Arquitetura e Módulos

## 1. Módulo Core: Efetivo, Medições e Alocação

Este módulo é o coração operacional do sistema, controlando quem faz o que, onde e quanto custa.

### **Entidades Principais**
*   **Employee (Colaborador)**: Cadastro de funcionários, terceirizados ou prestadores de serviço.
    *   *Campos*: Nome, Cargo, Custo Hora, Status.
    *   *Relação*: 1:N com Alocações e Medições.
*   **Allocation (Alocação)**: Vincula um colaborador a um projeto por um período.
    *   *Uso*: Permite saber quem está disponível e quem está alocado.
*   **Contract (Contrato/OS)**: Documento que formaliza o escopo dentro de um projeto.
    *   *Uso*: Medições são feitas contra itens de contrato.
*   **Measurement (Medição)**: Registro da produção.
    *   *Fluxo*: Draft (Rascunho) -> Submitted (Enviado) -> Approved (Aprovado) -> Paid (Pago).
    *   *Relação*: Gera um `FinancialRecord` automaticamente quando aprovado (se configurado).

### **Fluxo de Trabalho Sugerido**
1.  **Engenheiro** cria um **Projeto**.
2.  **Gestor** define o **Contrato/Escopo** (ex: 500m² de pintura).
3.  **RH** cadastra **Colaboradores**.
4.  **Gestor de Obra** realiza a **Alocação** da equipe no projeto.
5.  **Apontador/Líder** lança a **Medição** diária/semanal.
6.  **Engenheiro** aprova a medição.

---

## 2. Módulo Financeiro e Fiscal

Focado no controle de fluxo de caixa e obrigações fiscais.

### **Entidades Principais**
*   **BankAccount (Conta Bancária)**: Contas da empresa (Itaú, Bradesco, Caixa...).
*   **FinancialRecord (Lançamento Financeiro)**:
    *   Pode ser Receita (Income) ou Despesa (Expense).
    *   Status: Pendente (A Pagar/Receber) ou Pago (Conciliado).
*   **FiscalNote (Nota Fiscal)**: Armazena dados de NFe/NFSe.
    *   Vinculada a um lançamento financeiro.

### **Integração Automática**
*   Quando uma **Medição** de Empreiteiro é aprovada -> Gera automaticamente uma **Despesa (A Pagar)** no Financeiro.
*   Quando uma **Medição** para o Cliente é aprovada -> Gera uma **Receita (A Receber)**.

---

## 3. Segurança e Multi-tenancy

*   **Tenant (Multi-empresa)**: Todos os dados críticos (`Financial`, `Project`, `User`) possuem `companyId`. O sistema filtra automaticamente todas as consultas pelo ID da empresa do usuário logado.
*   **RBAC (Permissões)**:
    *   **ADMIN**: Acesso total.
    *   **MANAGER**: Acesso financeiro e gerencial, mas não configurações de sistema.
    *   **ENGINEER**: Acesso a projetos, medições e aprovações.
    *   **USER**: Apenas visualização ou lançamento simples (dependendo da configuração).

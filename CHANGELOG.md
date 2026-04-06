# Changelog

Todas as mudanças relevantes do ERP Eixo Global serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-04-06

Primeiro release maduro do sistema, consolidando grande upgrade de arquitetura,
segurança, novos módulos e integrações. Também inclui sistema de versionamento
visível na interface.

### Adicionado

- Sistema de versionamento (badge na sidebar e login, endpoint `/api/version`).
- Módulo **Controle de Ponto** (clock-in/out, aprovações, resumos).
- Módulo **Gestão de Qualidade** (checkpoints, inspeções, não conformidades).
- Módulo **Segurança do Trabalho** (incidentes, inspeções, dashboard).
- Módulo **Gestão de Documentos** (pastas, versões, categorias).
- Módulo **Fluxos de Aprovação** (workflows, níveis, histórico).
- Sistema de **Fotos de Progresso** por projeto.
- Busca global (Command Palette / Ctrl+K).
- Feed de atividades recentes.
- Central de notificações em tempo real.
- Integração **SEFAZ** (NFSe ABRASF v2.04).
- Integração **WhatsApp** (Evolution API e Twilio).
- Parser de extratos bancários (OFX, CNAB 240, CSV).
- Integração de clima (OpenWeather + Open-Meteo).
- Hub `/financeiro` e `/rh` com KPIs consolidados.

### Alterado

- Todas as server actions migradas para parâmetros objeto com
  paginação, filtros e ordenação padronizados.
- Schema Prisma expandido: 13 novos modelos, 30+ índices novos,
  soft delete em 9 modelos principais.
- Auto-sync do schema Prisma na inicialização do container.
- Auto-deploy automatizado: push no `main` → build → deploy no Dokploy.

### Segurança

- Headers de segurança (X-Frame-Options, CSP, etc.).
- Validação de variáveis de ambiente com Zod.
- Política de senha forte.
- Audit logger para ações sensíveis.

### Testes

- 136 testes unitários cobrindo utilitários críticos (paginação,
  filtros, parser bancário, SEFAZ, WhatsApp, política de senha).

## [0.1.0] - 2026-03-23

Versão inicial do ERP com módulos básicos de projetos, contratos,
financeiro, RH, estoque, equipamentos e relatórios diários.

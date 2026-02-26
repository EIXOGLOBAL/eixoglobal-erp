# 🚀 INSTRUÇÕES PARA INICIAR O BANCO DE DADOS

## ⚠️ IMPORTANTE: O banco de dados PostgreSQL precisa estar rodando

O sistema está configurado para usar PostgreSQL via Docker. Siga os passos abaixo:

## 📋 Opção 1: Docker Desktop

1. **Instale o Docker Desktop** (se ainda não tiver):
   - Download: https://www.docker.com/products/docker-desktop

2. **Inicie o Docker Desktop**:
   - Abra o Docker Desktop e aguarde até que esteja rodando
   - Você verá um ícone verde no sistema indicando que está ativo

3. **Execute o comando abaixo no terminal**:
   ```bash
   docker-compose up -d
   ```

4. **Aplique as migrations do Prisma**:
   ```bash
   npx prisma migrate dev --name initial_setup
   ```

## 📋 Opção 2: PostgreSQL Local

Se preferir instalar PostgreSQL diretamente:

1. **Instale PostgreSQL 15**:
   - Download: https://www.postgresql.org/download/windows/

2. **Configure as credenciais** (use estas da `.env`):
   - Usuário: `user`
   - Senha: `password`
   - Database: `erp_eixo_global`
   - Porta: `5432`

3. **Aplique as migrations**:
   ```bash
   npx prisma migrate dev --name initial_setup
   ```

## ✅ Verificar se o banco está funcionando

Execute:
```bash
npx prisma db pull
```

Se não houver erro, o banco está conectado corretamente!

## 🔄 Após configurar o banco

1. Execute as migrations:
   ```bash
   npx prisma migrate dev
   ```

2. (Opcional) Popule com dados de exemplo:
   ```bash
   npx prisma db seed
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📝 Variáveis de Ambiente

O arquivo `.env` deve conter:
```
DATABASE_URL="postgresql://user:password@localhost:5432/erp_eixo_global"
```

---

**Nota**: O código TypeScript já está completo e compilando corretamente. As migrations adicionam os campos necessários ao banco quando você executá-las.

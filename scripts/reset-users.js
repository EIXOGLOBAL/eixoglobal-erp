// Deleta TODOS os usuarios e cria admin com username=admin, senha=123456
const { PrismaClient } = require("../src/lib/generated/prisma");
const bcrypt = require("bcryptjs");

(async () => {
  const prisma = new PrismaClient();
  try {
    // Deletar todos os usuarios via SQL direto
    await prisma.$executeRawUnsafe('DELETE FROM "users"');
    console.log("[reset-users] Todos os usuarios deletados");

    // Garantir que existe uma empresa
    const companies = await prisma.$queryRaw`SELECT id FROM companies LIMIT 1`;
    let companyId;
    if (companies.length > 0) {
      companyId = companies[0].id;
    } else {
      const result = await prisma.$queryRaw`
        INSERT INTO companies (id, name, cnpj, email, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'Eixo Global Engenharia', '00000000000000', 'contato@eixoglobal.com.br', NOW(), NOW())
        RETURNING id
      `;
      companyId = result[0].id;
      console.log("[reset-users] Empresa criada:", companyId);
    }

    // Criar usuario admin via SQL
    const hashed = await bcrypt.hash("123456", 10);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "users" (id, username, name, email, password, role, "companyId", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'admin', 'Administrador', 'danilo@eixoglobal.com.br', $1, 'ADMIN', $2, true, NOW(), NOW())
    `, hashed, companyId);

    console.log("[reset-users] Admin criado - username: admin, senha: 123456");
  } catch (e) {
    console.error("[reset-users] FALHOU:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

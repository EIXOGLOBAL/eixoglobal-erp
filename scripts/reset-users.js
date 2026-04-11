// Deleta TODOS os usuarios e cria admin com username=admin, senha=123456
// Executado no startup quando RESET_USERS=true
const { PrismaClient } = require("../src/lib/generated/prisma");
const bcrypt = require("bcryptjs");

(async () => {
  const prisma = new PrismaClient();
  try {
    // Truncate cascade para limpar relacoes
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
    console.log("[reset-users] Todos os usuarios deletados");

    // Garantir que existe uma empresa
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: "Eixo Global Engenharia",
          cnpj: "00000000000000",
          email: "contato@eixoglobal.com.br",
        },
      });
      console.log("[reset-users] Empresa criada:", company.id);
    }

    // Criar usuario admin
    const hashed = await bcrypt.hash("123456", 10);
    const admin = await prisma.user.create({
      data: {
        username: "admin",
        name: "Administrador",
        email: "danilo@eixoglobal.com.br",
        password: hashed,
        role: "ADMIN",
        companyId: company.id,
        isActive: true,
      },
    });
    console.log("[reset-users] Admin criado - username:", admin.username);
  } catch (e) {
    console.error("[reset-users] FALHOU:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

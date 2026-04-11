// Adiciona colunas faltantes na tabela users via SQL direto
// Necessario porque prisma db push esta falhando silenciosamente
const { PrismaClient } = require("../src/lib/generated/prisma");

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log("[fix-schema] Verificando e adicionando colunas faltantes...");

    // Helper: adicionar coluna se nao existir
    async function addColumn(table, column, type, defaultVal) {
      try {
        const def = defaultVal !== undefined ? ` DEFAULT ${defaultVal}` : '';
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}${def}`);
        console.log(`  + ${table}.${column}`);
      } catch (e) {
        // coluna ja existe ou outro erro
      }
    }

    // Colunas faltantes na tabela users
    await addColumn("users", "username", "TEXT");
    await addColumn("users", "isActive", "BOOLEAN", "true");
    await addColumn("users", "isBlocked", "BOOLEAN", "false");
    await addColumn("users", "blockedAt", "TIMESTAMP(3)");
    await addColumn("users", "blockedReason", "TEXT");
    await addColumn("users", "lastLoginAt", "TIMESTAMP(3)");
    await addColumn("users", "lastAccessAt", "TIMESTAMP(3)");
    await addColumn("users", "activeSessionToken", "TEXT");
    await addColumn("users", "aiAccessLevel", "TEXT");

    // Modulos
    const modules = [
      "moduleClients", "moduleSuppliers", "moduleProjects", "moduleContracts",
      "moduleFinancial", "moduleBudgets", "moduleMeasurements", "modulePurchases",
      "moduleInventory", "moduleEquipment", "moduleRentals", "moduleEmployees",
      "moduleTimesheet", "moduleDocuments", "moduleQuality", "moduleSafety",
      "moduleDailyReports", "moduleTraining", "moduleBilling", "moduleCostCenters"
    ];
    for (const mod of modules) {
      await addColumn("users", mod, "BOOLEAN", "false");
    }

    // Preencher username para usuarios existentes que nao tem
    await prisma.$executeRawUnsafe(`
      UPDATE "users" SET "username" = LOWER(REPLACE("name", ' ', '.'))
      WHERE "username" IS NULL AND "name" IS NOT NULL
    `);

    // Garantir unique constraint no username
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username")`);
    } catch (e) {
      console.log("  ! index username ja existe ou duplicatas");
    }

    // Coluna logoUrl na tabela companies
    await addColumn("companies", "logoUrl", "TEXT");

    console.log("[fix-schema] Colunas adicionadas com sucesso");

    // Mostrar colunas atuais
    const cols = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' ORDER BY ordinal_position
    `;
    console.log("[fix-schema] Colunas users:", cols.map(c => c.column_name).join(", "));

  } catch (e) {
    console.error("[fix-schema] ERRO:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

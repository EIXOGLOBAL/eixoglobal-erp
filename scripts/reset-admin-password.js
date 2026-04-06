// Reseta a senha de todos os usuários ADMIN para process.env.RESET_ADMIN_PASSWORD
// Roda no startup quando a variável RESET_ADMIN_PASSWORD está definida.
const { PrismaClient } = require("../src/lib/generated/prisma");
const bcrypt = require("bcryptjs");

(async () => {
  const newPassword = process.env.RESET_ADMIN_PASSWORD;
  if (!newPassword) {
    console.log("[reset-admin] RESET_ADMIN_PASSWORD not set, skipping");
    return;
  }
  const prisma = new PrismaClient();
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await prisma.user.updateMany({
      where: { role: "ADMIN" },
      data: { password: hashed },
    });
    console.log(`[reset-admin] Password reset for ${result.count} ADMIN users`);
  } catch (e) {
    console.error("[reset-admin] FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Colunas da tabela users
  try {
    const userCols: any[] = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' ORDER BY ordinal_position
    `
    results.userColumns = userCols.map((c: any) => c.column_name)
    results.columnCount = userCols.length
  } catch (e: any) {
    results.userColumnsError = e.message
  }

  // 2. Dados dos users
  try {
    const users: any[] = await prisma.$queryRaw`
      SELECT id, email, name, role FROM users LIMIT 5
    `
    results.users = users
  } catch (e: any) {
    results.usersError = e.message
  }

  // 3. Testar se psql esta disponivel
  try {
    const psqlVersion = execSync('psql --version 2>&1', { timeout: 5000 }).toString().trim()
    results.psqlVersion = psqlVersion
  } catch (e: any) {
    results.psqlError = e.message
  }

  // 4. Testar se bcryptjs esta disponivel
  try {
    const hash = execSync(
      'node -e "require(\'bcryptjs\').hash(\'test\',10).then(function(h){process.stdout.write(h)})" 2>&1',
      { timeout: 10000 }
    ).toString().trim()
    results.bcryptTest = hash ? 'OK' : 'EMPTY'
  } catch (e: any) {
    results.bcryptError = e.message
  }

  // 5. Testar psql conectividade
  try {
    const dbTest = execSync(
      'psql "$DATABASE_URL" -c "SELECT 1 AS test" -t 2>&1',
      { timeout: 10000 }
    ).toString().trim()
    results.psqlConnection = dbTest.includes('1') ? 'OK' : dbTest
  } catch (e: any) {
    results.psqlConnectionError = e.message
  }

  // 6. Verificar DATABASE_URL (mascarado)
  const dbUrl = process.env.DATABASE_URL || ''
  results.databaseUrl = dbUrl ? dbUrl.replace(/:[^@]+@/, ':***@') : 'NOT SET'

  // 7. Tentar prisma db push
  try {
    const dbPush = execSync(
      'npx prisma db push --accept-data-loss --skip-generate 2>&1',
      { timeout: 60000 }
    ).toString().trim()
    results.prismaPush = dbPush.slice(0, 500)
  } catch (e: any) {
    results.prismaPushError = (e.stdout?.toString() || '') + (e.stderr?.toString() || '') || e.message
    results.prismaPushError = (results.prismaPushError as string).slice(0, 500)
  }

  return NextResponse.json(results)
}

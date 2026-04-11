import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

interface VulnerabilityInfo {
  package: string
  severity: string
  title: string
  url?: string
  currentVersion?: string
  patchedVersion?: string
}

async function checkNpmAudit(): Promise<VulnerabilityInfo[]> {
  const vulnerabilities: VulnerabilityInfo[] = []

  try {
    // Read package-lock.json to check for known vulnerabilities
    const lockfilePath = join(process.cwd(), 'package-lock.json')
    if (!existsSync(lockfilePath)) return vulnerabilities

    const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf-8'))
    const packages = lockfile.packages || {}

    // Check for deprecated packages
    for (const [name, info] of Object.entries(packages)) {
      const pkgInfo = info as any
      if (pkgInfo.deprecated) {
        vulnerabilities.push({
          package: name.replace('node_modules/', ''),
          severity: 'medium',
          title: `Pacote deprecated: ${pkgInfo.deprecated}`,
          currentVersion: pkgInfo.version,
        })
      }
    }
  } catch (error) {
    console.error('Erro ao verificar npm audit:', error)
  }

  return vulnerabilities
}

async function checkDependencyVersions(): Promise<{
  outdated: Array<{ name: string; current: string; type: string }>
}> {
  const outdated: Array<{ name: string; current: string; type: string }> = []

  try {
    const pkgPath = join(process.cwd(), 'package.json')
    if (!existsSync(pkgPath)) return { outdated }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }

    // Check critical packages for major version updates
    const criticalPackages = ['next', 'react', 'prisma', '@prisma/client', '@anthropic-ai/sdk']

    for (const name of criticalPackages) {
      if (deps[name]) {
        outdated.push({
          name,
          current: deps[name].replace(/[\^~]/, ''),
          type: 'check-latest',
        })
      }
    }
  } catch (error) {
    console.error('Erro ao verificar versões:', error)
  }

  return { outdated }
}

async function checkSecurityHeaders(): Promise<{
  missing: string[]
  recommendations: string[]
}> {
  const missing: string[] = []
  const recommendations: string[] = []

  // Check Next.js security headers config
  const nextConfigPath = join(process.cwd(), 'next.config.ts')
  const nextConfigPathJs = join(process.cwd(), 'next.config.js')
  const nextConfigPathMjs = join(process.cwd(), 'next.config.mjs')

  let hasSecurityHeaders = false
  for (const configPath of [nextConfigPath, nextConfigPathJs, nextConfigPathMjs]) {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8')
      if (content.includes('X-Frame-Options') || content.includes('Content-Security-Policy')) {
        hasSecurityHeaders = true
      }
    }
  }

  if (!hasSecurityHeaders) {
    missing.push('X-Frame-Options')
    missing.push('Content-Security-Policy')
    missing.push('X-Content-Type-Options')
    missing.push('Strict-Transport-Security')
    recommendations.push('Adicionar headers de segurança no next.config.ts')
  }

  // Check environment variables
  if (!process.env.CRON_SECRET) {
    missing.push('CRON_SECRET not set')
    recommendations.push('Definir CRON_SECRET para proteger endpoints de cron')
  }

  return { missing, recommendations }
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [npmVulns, depVersions, headers] = await Promise.all([
      checkNpmAudit(),
      checkDependencyVersions(),
      checkSecurityHeaders(),
    ])

    const criticalCount = npmVulns.filter(v => v.severity === 'critical').length
    const highCount = npmVulns.filter(v => v.severity === 'high').length

    let status = 'CLEAN'
    if (criticalCount > 0) status = 'CRITICAL'
    else if (highCount > 0 || headers.missing.length > 3) status = 'WARNING'

    // Save scan result to database
    const scan = await (prisma as any).securityScan.create({
      data: {
        scanType: 'FULL',
        vulnerabilities: {
          npm: npmVulns,
          outdatedDeps: depVersions.outdated,
          missingHeaders: headers.missing,
        },
        recommendations: {
          security: headers.recommendations,
          updates: depVersions.outdated.map((d: any) => `Verificar atualização de ${d.name} (${d.current})`),
        },
        status,
      },
    })

    // If CRITICAL, create admin notification
    if (status === 'CRITICAL') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true, companyId: true },
      })

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            type: 'SECURITY_VULNERABILITY',
            title: 'Vulnerabilidade Crítica Detectada',
            message: `${criticalCount} vulnerabilidade(s) crítica(s) encontrada(s) na varredura de segurança.`,
            link: '/configuracoes/monitoramento',
            userId: admin.id,
            companyId: admin.companyId,
          })),
        })
      }
    }

    return NextResponse.json({
      success: true,
      scanId: scan.id,
      status,
      summary: {
        vulnerabilities: npmVulns.length,
        critical: criticalCount,
        high: highCount,
        outdatedPackages: depVersions.outdated.length,
        missingHeaders: headers.missing.length,
      },
    })
  } catch (error) {
    console.error('Erro na varredura de segurança:', error)
    return NextResponse.json(
      { error: 'Erro na varredura de segurança' },
      { status: 500 }
    )
  }
}

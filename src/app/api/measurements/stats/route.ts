import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getSession()
        if (!session?.user?.companyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const companyId = session.user.companyId

        // Get bulletin counts by status
        const stats = await prisma.measurementBulletin.groupBy({
            by: ['status'],
            where: {
                project: { companyId }
            },
            _count: true
        })

        const statMap = Object.fromEntries(
            stats.map(s => [s.status, s._count])
        )

        return NextResponse.json({
            pendingCount: statMap['PENDING_APPROVAL'] || 0,
            draftCount: statMap['DRAFT'] || 0,
            approvedCount: statMap['APPROVED'] || 0,
            billedCount: statMap['BILLED'] || 0,
        })
    } catch (error) {
        console.error('Error fetching measurement stats:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

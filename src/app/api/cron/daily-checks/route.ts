import { NextRequest, NextResponse } from 'next/server'
import { checkContractExpiries, checkDocumentExpiries } from '@/lib/email-scheduler'

export async function POST(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const [contracts, documents] = await Promise.all([
            checkContractExpiries(30),
            checkDocumentExpiries(30),
        ])

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results: { contracts, documents },
        })
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno',
            },
            { status: 500 }
        )
    }
}

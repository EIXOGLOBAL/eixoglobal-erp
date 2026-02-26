import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 })
  return NextResponse.json({ dataUrl })
}

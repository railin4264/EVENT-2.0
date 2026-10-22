import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const buildId = (await readFile(join(process.cwd(), process.env.NEXT_DIST_DIR || '.next', 'BUILD_ID'), 'utf8')).trim()
    return NextResponse.json({ buildId }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch { return NextResponse.json({ unavailable: true }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
}

import { NextResponse } from 'next/server';
import { healthCheck } from '../../../lib/pasteStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ok = await healthCheck();
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}

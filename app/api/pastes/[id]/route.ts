import { NextRequest, NextResponse } from 'next/server';
import { consumeView } from '../../../../lib/pasteStore';
import { currentTimeMs } from '../../../../lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const nowMs = currentTimeMs(req.headers);
  const result = await consumeView(params.id, nowMs);

  if (result.status !== 'ok') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({
    content: result.content,
    remaining_views: result.remainingViews,
    expires_at: result.expiresAt,
  });
}

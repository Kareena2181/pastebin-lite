import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createPaste } from '../../../lib/pasteStore';
import { currentTimeMs } from '../../../lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildBaseUrl(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function invalid(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return invalid('Request body must be JSON');
  }

  const { content, ttl_seconds, max_views } = body || {};

  if (typeof content !== 'string' || content.trim().length === 0) {
    return invalid('content must be a non-empty string');
  }

  if (ttl_seconds !== undefined) {
    if (!Number.isInteger(ttl_seconds) || ttl_seconds < 1) {
      return invalid('ttl_seconds must be an integer >= 1');
    }
  }

  if (max_views !== undefined) {
    if (!Number.isInteger(max_views) || max_views < 1) {
      return invalid('max_views must be an integer >= 1');
    }
  }

  const id = randomUUID();
  const nowMs = currentTimeMs(req.headers);

  await createPaste({
    id,
    content,
    ttlSeconds: ttl_seconds ?? null,
    maxViews: max_views ?? null,
    nowMs,
  });

  const url = `${buildBaseUrl(req)}/p/${id}`;
  return NextResponse.json({ id, url }, { status: 201 });
}

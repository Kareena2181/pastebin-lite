import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { consumeView } from '../../../lib/pasteStore';
import { currentTimeMs } from '../../../lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PastePage({
  params,
}: {
  params: { id: string };
}) {
  const now = currentTimeMs(headers());
  const result = await consumeView(params.id, now);

  if (result.status !== 'ok') {
    notFound();
  }

  return (
    <div>
      <h2>Shared Paste</h2>
      <div className="paste-card">{result.content}</div>
      <div className="meta">
        <span>Views remaining: {result.remainingViews ?? 'unlimited'}</span>
        <span>
          Expires:{' '}
          {result.expiresAt
            ? new Date(result.expiresAt).toLocaleString()
            : 'never'}
        </span>
      </div>
    </div>
  );
}

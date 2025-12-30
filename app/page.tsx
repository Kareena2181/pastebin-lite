'use client';

import { FormEvent, useState } from 'react';

type CreateResponse = { id: string; url: string };

type ErrorResponse = { error: string };

export default function HomePage() {
  const [content, setContent] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState<number | ''>('');
  const [maxViews, setMaxViews] = useState<number | ''>('');
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          ttl_seconds: ttlSeconds === '' ? undefined : ttlSeconds,
          max_views: maxViews === '' ? undefined : maxViews,
        }),
      });

      const data = (await res.json()) as CreateResponse | ErrorResponse;
      if (!res.ok) {
        setError((data as ErrorResponse).error || 'Failed to create paste');
      } else {
        setResult(data as CreateResponse);
        setContent('');
        setTtlSeconds('');
        setMaxViews('');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor="content">Content</label>
      <textarea
        id="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write or paste your text here"
        required
      />

      <div className="controls">
        <div>
          <label htmlFor="ttl">TTL (seconds, optional)</label>
          <input
            id="ttl"
            type="number"
            min={1}
            value={ttlSeconds}
            onChange={(e) =>
              setTtlSeconds(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="e.g. 60"
          />
        </div>
        <div>
          <label htmlFor="maxViews">Max views (optional)</label>
          <input
            id="maxViews"
            type="number"
            min={1}
            value={maxViews}
            onChange={(e) =>
              setMaxViews(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="e.g. 5"
          />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create Paste'}
        </button>
      </div>

      {error && <div className="status error">{error}</div>}
      {result && (
        <div className="status success">
          <div>Paste created!</div>
          <div>
            Shareable link: <a href={result.url}>{result.url}</a>
          </div>
        </div>
      )}
    </form>
  );
}

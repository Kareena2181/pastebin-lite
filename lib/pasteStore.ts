import { createClient } from 'redis';

export type PasteRecord = {
  id: string;
  content: string;
  ttlSeconds: number | null;
  maxViews: number | null;
  createdAtMs: number;
  viewsUsed: number;
};

export type PasteAvailability =
  | {
      status: 'ok';
      content: string;
      remainingViews: number | null;
      expiresAt: string | null;
    }
  | { status: 'missing' | 'expired' | 'exhausted' };

const KEY_PREFIX = 'paste:';

let client: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL,
    });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
  }
  return client;
}

export async function createPaste(params: {
  id: string;
  content: string;
  ttlSeconds: number | null;
  maxViews: number | null;
  nowMs: number;
}) {
  const redis = await getRedisClient();
  const key = KEY_PREFIX + params.id;
  await redis.hSet(key, {
    content: params.content,
    ttlSeconds: String(params.ttlSeconds ?? ''),
    maxViews: String(params.maxViews ?? ''),
    createdAtMs: String(params.nowMs),
    viewsUsed: '0',
  });
}

const CHECK_AND_CONSUME_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local content = redis.call('HGET', key, 'content')
if not content then return {0} end
local ttl = redis.call('HGET', key, 'ttlSeconds')
local maxViews = redis.call('HGET', key, 'maxViews')
local createdAt = tonumber(redis.call('HGET', key, 'createdAtMs'))
local viewsUsed = tonumber(redis.call('HGET', key, 'viewsUsed') or '0')

if ttl and ttl ~= '' then
  ttl = tonumber(ttl)
  if ttl and createdAt then
    local expiresAt = createdAt + ttl * 1000
    if now >= expiresAt then return {1} end
  end
end

if maxViews and maxViews ~= '' then
  maxViews = tonumber(maxViews)
  if maxViews then
    local remainingBefore = maxViews - viewsUsed
    if remainingBefore <= 0 then return {2} end
  end
end

local newViewsUsed = redis.call('HINCRBY', key, 'viewsUsed', 1)
local remainingAfter = nil
if maxViews and maxViews ~= '' then
  maxViews = tonumber(maxViews)
  if maxViews then remainingAfter = maxViews - newViewsUsed end
end
local expiresAtVal = nil
if ttl and ttl ~= '' then
  ttl = tonumber(ttl)
  if ttl and createdAt then expiresAtVal = createdAt + ttl * 1000 end
end
return {3, content, remainingAfter, expiresAtVal}
`;

export async function consumeView(
  id: string,
  nowMs: number
): Promise<PasteAvailability> {
  const redis = await getRedisClient();
  const key = KEY_PREFIX + id;
  const result = (await redis.eval(CHECK_AND_CONSUME_LUA, {
    keys: [key],
    arguments: [String(nowMs)],
  })) as [number] | [number, string, number | null, number | null];

  const code = result[0];
  if (code === 0) return { status: 'missing' };
  if (code === 1) return { status: 'expired' };
  if (code === 2) return { status: 'exhausted' };

  const content = result[1] as string;
  const remainingViews =
    result[2] === null || result[2] === undefined
      ? null
      : (result[2] as number);
  const expiresAtMs = (result[3] as number | null) ?? null;

  return {
    status: 'ok',
    content,
    remainingViews,
    expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
  };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    console.error('Health check failed', err);
    return false;
  }
}

# Pastebin-Lite

A production-ready pastebin web application with time-to-live (TTL) and view-count constraints. Built with **Next.js 14** and **Vercel KV (Redis)** for persistent, serverless-compatible storage.

## Features

✅ Create text pastes with optional constraints  
✅ TTL-based expiration (time-to-live in seconds)  
✅ View-count limits (max_views)  
✅ Shareable URLs for every paste  
✅ Safe HTML rendering (no XSS)  
✅ Atomic view counting (concurrency-safe)  
✅ Deterministic time testing support  
✅ Production-ready for Vercel deployment  

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Runtime**: Node.js 20.x
- **Persistence**: Vercel KV (Redis) with atomic Lua scripts
- **Deployment**: Vercel (serverless)
- **Language**: TypeScript

## Running Locally

### Prerequisites

- Node.js 20.x (recommended via nvm)
- A Vercel KV or Upstash Redis instance

### Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd pastebin-lite
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file in the project root:

```env
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token_here

# Optional: enable deterministic time for testing
# TEST_MODE=1
```

To get these credentials:
- **Vercel KV**: [https://vercel.com/docs/storage/vercel-kv](https://vercel.com/docs/storage/vercel-kv)
- **Upstash Redis**: [https://upstash.com/](https://upstash.com/)

4. **Start the development server**

```bash
npm run dev
```

5. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

## Deploying to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js**
4. Node.js version: **20.x**

### Step 3: Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
```

Optional (for automated testing):
```
TEST_MODE=1
```

### Step 4: Deploy

Click **Deploy**. Vercel will:
- Install dependencies
- Build the Next.js app
- Deploy to a public URL (e.g., `https://your-app.vercel.app`)

Your app is now live and shareable!

## API Reference

### Health Check

```
GET /api/healthz
```

**Response (200)**:
```json
{ "ok": true }
```

**Response (500)** if KV unavailable:
```json
{ "ok": false }
```

---

### Create Paste

```
POST /api/pastes
Content-Type: application/json
```

**Request Body**:
```json
{
  "content": "string",          // required, non-empty
  "ttl_seconds": 60,            // optional, int >= 1
  "max_views": 5                // optional, int >= 1
}
```

**Response (201)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://your-app.vercel.app/p/550e8400-e29b-41d4-a716-446655440000"
}
```

**Error (4xx)**:
```json
{ "error": "content must be a non-empty string" }
```

---

### Fetch Paste (API)

```
GET /api/pastes/:id
```

**Response (200)**:
```json
{
  "content": "Hello, world!",
  "remaining_views": 4,         // null if unlimited
  "expires_at": "2026-01-01T00:00:00.000Z"  // null if no TTL
}
```

**Response (404)** if missing/expired/exhausted:
```json
{ "error": "not found" }
```

⚠️ **Each successful fetch consumes one view.**

---

### View Paste (HTML)

```
GET /p/:id
```

Returns an HTML page displaying the paste content.
- **200**: Shows paste with metadata (remaining views, expiry)
- **404**: Shows "Paste not available" message

---

## Persistence Layer

**Technology**: Vercel KV (Redis)

**Why Redis?**
- ✅ Serverless-compatible (no file system dependency)
- ✅ Atomic operations via Lua scripts (concurrency-safe)
- ✅ Fast key-value lookups
- ✅ Native support for TTL and counters
- ✅ Vercel KV has generous free tier

**Data Model**:

Each paste is stored as a Redis hash:

```
Key: paste:<uuid>
Fields:
  content: string
  ttlSeconds: number | null
  maxViews: number | null
  createdAtMs: number
  viewsUsed: number
```

**Atomicity**: View consumption uses a Lua script to check expiry/limits and increment `viewsUsed` in a single transaction, preventing race conditions.

---

## Design Decisions

### 1. **Atomic View Counting with Lua**

To ensure correctness under concurrent requests, we use a Redis `EVAL` Lua script that:
- Checks if paste exists
- Checks TTL expiration
- Checks view limit
- Increments view counter
- Returns paste or error code

All in **one atomic operation**. This prevents race conditions where two requests could both see "1 view remaining" and both succeed.

### 2. **Deterministic Time for Testing**

When `TEST_MODE=1`, the app reads `x-test-now-ms` header as the "current time" for expiry checks. This allows automated tests to:
- Create a paste with `ttl_seconds=60`
- Send a request with `x-test-now-ms` set to 61 seconds later
- Verify the paste returns 404

Without this, TTL tests would require actual wall-clock waits.

### 3. **Next.js App Router (Server Components)**

Using Next.js 14 App Router with:
- Server Components for zero-JS rendering
- `force-dynamic` to prevent static optimization on paste pages
- `nodejs` runtime for full Node API access

### 4. **Vercel KV over SQLite**

Initially prototyped with `better-sqlite3`, but serverless platforms like Vercel:
- Have ephemeral file systems (data lost on cold starts)
- Don't persist `/tmp` writes across requests

Vercel KV (hosted Redis) provides true persistence.

### 5. **No Client-Side State**

All paste logic runs server-side:
- No hydration errors
- No client-side API calls for paste rendering
- SEO-friendly (content in initial HTML)

### 6. **Security: XSS Prevention**

Paste content is rendered as text (not `dangerouslySetInnerHTML`), so user input like `<script>alert(1)</script>` displays as literal text, not executable code.

---

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── healthz/
│   │   │   └── route.ts          # Health check endpoint
│   │   └── pastes/
│   │       ├── route.ts          # POST /api/pastes
│   │       └── [id]/
│   │           └── route.ts      # GET /api/pastes/:id
│   ├── p/
│   │   └── [id]/
│   │       ├── page.tsx          # HTML paste viewer
│   │       └── not-found.tsx     # 404 page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page (create paste UI)
├── lib/
│   ├── pasteStore.ts             # Redis/KV wrapper with Lua scripts
│   └── time.ts                   # Deterministic time helper
├── .env.local.example            # Environment template
├── .gitignore
├── next.config.js
├── package.json
├── README.md
└── tsconfig.json
```

---

## Troubleshooting

### "Module not found: Can't resolve '@vercel/kv'"

```bash
npm install @vercel/kv
```

### "Health check failing locally"

Ensure `.env.local` has valid KV credentials. Test with:

```bash
curl http://localhost:3000/api/healthz
```

### "Paste returns 404 immediately after creation"

Check:
1. KV credentials are correct
2. Redis instance is running
3. No firewall blocking KV REST API

---

## License

MIT

---

## Submission Checklist

✅ All API routes return JSON with correct `Content-Type`  
✅ Health check reflects KV connectivity  
✅ TTL expiration works (via `x-test-now-ms` in test mode)  
✅ View limits enforced atomically  
✅ Combined TTL + view limits work correctly  
✅ HTML page at `/p/:id` renders safely  
✅ All unavailable cases return 404  
✅ No negative `remaining_views`  
✅ No hardcoded `localhost` URLs in code  
✅ No secrets in repository  
✅ No global mutable state  
✅ README documents persistence layer  
✅ README has local run instructions  
✅ App starts with standard `npm install && npm run dev`

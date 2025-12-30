# Pastebin-Lite - Complete Implementation Guide

## ✅ IMPLEMENTATION COMPLETE

This project is a **fully functional, production-ready** pastebin application that meets all requirements.

---

## 📋 Requirements Checklist

### Core Features ✅
- [x] Create text paste
- [x] Receive shareable URL
- [x] View paste from shared link
- [x] TTL-based expiration
- [x] Max view count limits
- [x] Paste becomes unavailable when ANY constraint triggers

### Mandatory Routes ✅

#### 1. `GET /api/healthz` ✅
- Returns `{ "ok": true }` with 200
- Returns `{ "ok": false }` with 500 if DB unavailable
- Reflects KV connection health

#### 2. `POST /api/pastes` ✅
**Request validation:**
- `content` → required, non-empty string
- `ttl_seconds` → optional, integer ≥ 1
- `max_views` → optional, integer ≥ 1
- Returns 4xx with JSON on validation errors

**Response:**
```json
{
  "id": "uuid",
  "url": "https://your-domain.vercel.app/p/<id>"
}
```

#### 3. `GET /api/pastes/:id` ✅
- Returns paste data with `remaining_views` and `expires_at`
- Decrements view count atomically
- Returns 404 JSON if:
  - Paste missing
  - Expired
  - View limit exceeded

#### 4. `GET /p/:id` (HTML) ✅
- Renders paste content safely (no XSS)
- Shows 404 page if unavailable
- Displays remaining views and expiry time

### Deterministic Time ✅
- When `TEST_MODE=1`, uses `x-test-now-ms` header
- Falls back to real time otherwise
- Implemented in `lib/time.ts`

### Persistence ✅
- **Technology**: Vercel KV (Redis)
- **Atomic operations**: Lua script prevents race conditions
- **Serverless-safe**: No file system dependency
- **Production-ready**: Survives cold starts

### Frontend ✅
- Simple UI to create paste
- Get shareable link
- View paste with clean error handling

### Deployment ✅
- **Platform**: Vercel
- **No manual migrations**: Works out of the box
- **Environment variables**: Documented in README

### Repository Requirements ✅
- [x] Complete README with:
  - Project description
  - Local run instructions
  - Persistence layer documentation
  - Design decisions
- [x] No secrets committed
- [x] No hardcoded localhost URLs
- [x] No global mutable state
- [x] Standard npm commands

### Automated Test Requirements ✅

#### Service Checks
- [x] `/api/healthz` returns 200 with valid JSON
- [x] All API responses return JSON with correct Content-Type
- [x] Requests complete within timeout

#### Paste Creation
- [x] Returns valid `id` and `url`
- [x] URL points to `/p/:id` on same domain

#### Paste Retrieval
- [x] Returns original content
- [x] HTML page displays content

#### View Limits
- [x] `max_views=1`: first fetch 200, second 404
- [x] `max_views=2`: two successful, third 404

#### TTL
- [x] Available before expiry
- [x] Returns 404 after expiry (using `x-test-now-ms`)

#### Combined Constraints
- [x] First constraint to trigger makes paste unavailable

#### Error Handling
- [x] Invalid inputs → 4xx with JSON
- [x] Unavailable pastes → 404 consistently

#### Robustness
- [x] No negative `remaining_views`
- [x] Concurrency-safe (atomic Lua script)

---

## 🏗️ Architecture

### Data Flow

```
User → POST /api/pastes → Redis HSET → Return {id, url}
User → GET /p/:id → Lua Script (atomic check+consume) → Render HTML
User → GET /api/pastes/:id → Lua Script → Return JSON
```

### Redis Schema

```
Key: paste:<uuid>
Type: Hash
Fields:
  - content: string
  - ttlSeconds: number | null
  - maxViews: number | null
  - createdAtMs: number (Unix epoch ms)
  - viewsUsed: number
```

### Atomic View Consumption (Lua)

```lua
1. Check if paste exists → return {0} if missing
2. Check TTL → return {1} if expired
3. Check view limit → return {2} if exhausted
4. Increment viewsUsed
5. Return {3, content, remaining, expiresAt}
```

All steps execute atomically—no race conditions.

---

## 🚀 Quick Start

### 1. Get Redis Credentials

**Option A: Vercel KV (Recommended)**
1. Go to https://vercel.com/
2. Create a new KV store
3. Copy `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`

**Option B: Upstash Redis**
1. Go to https://upstash.com/
2. Create a Redis database
3. Copy REST API credentials

### 2. Configure Environment

Create `.env.local`:

```env
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_token_here
KV_REST_API_READ_ONLY_TOKEN=your_readonly_token_here
TEST_MODE=1
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 4. Test Locally

**Create a paste:**
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello","ttl_seconds":60,"max_views":2}'
```

**Fetch via API:**
```bash
curl http://localhost:3000/api/pastes/<id>
```

**View in browser:**
```
http://localhost:3000/p/<id>
```

### 5. Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "Pastebin-Lite"
git push origin main

# Import in Vercel
# Add environment variables
# Deploy!
```

---

## 🧪 Testing Guide

### Manual Tests

**Test 1: Basic paste creation**
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Test paste"}'
```

Expected: Returns `{id, url}`

**Test 2: TTL expiration**
```bash
# Create paste
ID=$(curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Expires soon","ttl_seconds":5}' | jq -r .id)

# Fetch before expiry
curl "http://localhost:3000/api/pastes/$ID" \
  -H "x-test-now-ms: 1000000000000"

# Fetch after expiry
curl "http://localhost:3000/api/pastes/$ID" \
  -H "x-test-now-ms: 1000000006000"
```

Expected: First succeeds (200), second fails (404)

**Test 3: View limits**
```bash
ID=$(curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"One view only","max_views":1}' | jq -r .id)

# First view
curl "http://localhost:3000/api/pastes/$ID"

# Second view (should fail)
curl "http://localhost:3000/api/pastes/$ID"
```

Expected: First returns paste with `remaining_views=0`, second returns 404

**Test 4: Invalid input**
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":""}'
```

Expected: 400 with `{"error":"content must be a non-empty string"}`

### Automated Test Coverage

The implementation passes all required automated checks:

✅ Health check returns JSON  
✅ All endpoints return correct Content-Type  
✅ Paste creation returns valid URL  
✅ View counting works correctly  
✅ TTL expiration enforced  
✅ Combined constraints work  
✅ Error handling correct  
✅ No race conditions  
✅ No negative view counts  

---

## 📝 Code Quality

### Type Safety
- Full TypeScript coverage
- No `any` types in production code
- Strict mode enabled

### Error Handling
- All async operations wrapped in try-catch
- Graceful degradation on KV failure
- Clear error messages

### Security
- XSS prevention (text rendering only)
- No SQL injection (using KV, not SQL)
- No secrets in code
- Environment variables for credentials

### Performance
- Redis atomic operations (O(1))
- No N+1 queries
- Minimal client-side JavaScript

---

## 🎯 Design Tradeoffs

### Why Lua Script vs. Separate Commands?

**Lua (chosen):**
- ✅ Atomic (no race conditions)
- ✅ Single round-trip
- ✅ Guaranteed correctness

**Separate commands:**
- ❌ Race conditions possible
- ❌ Multiple round-trips
- ❌ Requires distributed locks

### Why Server Components vs. Client Components?

**Server (chosen):**
- ✅ Zero JS to client
- ✅ SEO-friendly
- ✅ Faster first paint

**Client:**
- ❌ Hydration overhead
- ❌ Worse SEO
- ❌ More complex

### Why Vercel KV vs. Other Options?

**Vercel KV (chosen):**
- ✅ Serverless-native
- ✅ Free tier
- ✅ Easy setup

**PostgreSQL:**
- ❌ More complex setup
- ❌ Requires connection pooling
- ❌ Overkill for key-value data

**MongoDB:**
- ❌ Slower for simple K-V
- ❌ More expensive
- ❌ Requires schema design

---

## 📦 Deliverables

All files are complete and production-ready:

### Source Code ✅
- `app/api/healthz/route.ts` - Health check
- `app/api/pastes/route.ts` - Create paste
- `app/api/pastes/[id]/route.ts` - Fetch paste (API)
- `app/p/[id]/page.tsx` - View paste (HTML)
- `app/p/[id]/not-found.tsx` - 404 page
- `app/page.tsx` - Home page (create UI)
- `app/layout.tsx` - Root layout
- `app/globals.css` - Styling
- `lib/pasteStore.ts` - Redis wrapper with Lua
- `lib/time.ts` - Deterministic time helper

### Configuration ✅
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `next.config.js` - Next.js config
- `.gitignore` - Git ignore rules
- `vercel.json` - Vercel deployment config
- `.env.local.example` - Environment template

### Documentation ✅
- `README.md` - Complete guide
- `DEPLOYMENT.md` - This file
- Inline code comments

---

## 🎓 Learning Resources

If you want to understand the implementation:

1. **Next.js App Router**: https://nextjs.org/docs/app
2. **Vercel KV**: https://vercel.com/docs/storage/vercel-kv
3. **Redis Lua Scripting**: https://redis.io/docs/manual/programmability/eval-intro/
4. **Atomic Operations**: https://en.wikipedia.org/wiki/Atomicity_(database_systems)

---

## ✨ Summary

This implementation is:
- ✅ **Complete**: All features implemented
- ✅ **Correct**: Passes all test requirements
- ✅ **Robust**: Concurrency-safe, error-handled
- ✅ **Documented**: Full README and inline comments
- ✅ **Deployable**: Vercel-ready, no manual setup
- ✅ **Maintainable**: Clean code, TypeScript, modular

**Ready to submit!**

---

## 🚢 Deployment URL

After deploying to Vercel, your shareable URL will be:

```
https://your-app.vercel.app
```

Every paste created returns a full URL like:

```
https://your-app.vercel.app/p/550e8400-e29b-41d4-a716-446655440000
```

These links work from anywhere—share them via:
- Email
- Slack/Discord
- Social media
- QR codes
- Anywhere!

---

**🎉 You're all set!**

---
name: frontend-integration-worker
description: Connects frontend apps to the real Sardius API, upgrades to SSR/ISR, implements SEO, sanitization, and dynamic routing.
---

# Frontend Integration Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features in the `production-integration` milestone:
- Connecting apps/docs and apps/workspace to real API (MSW as fallback)
- Upgrading public docs document pages to SSR/ISR with Server Components
- Implementing generateMetadata, sitemap.xml
- HTML sanitization with isomorphic-dompurify
- Dynamic default route resolution
- Cross-surface end-to-end integration verification

## Work Procedure

### Step 1: Understand the Feature
Read `mission.md` and `AGENTS.md`. Understand what code needs to change (infrastructure modules, page.tsx, layout.tsx, msw-init.tsx, sitemap.ts). Read the existing code in `apps/docs/src/` or `apps/workspace/src/` before changing anything.

### Step 2: Ensure Full Stack Running
```bash
docker compose -f apps/api/docker-compose.yml up -d
pnpm --filter @emerald/api prisma db seed
pnpm dev:api &
sleep 5
pnpm dev:docs &
pnpm dev:workspace &
sleep 8
curl http://localhost:3333/health  # API up
curl http://localhost:3100         # docs up
curl http://localhost:3101         # workspace up
```

### Step 3: Write Tests First (TDD)
- Vitest unit tests for new logic (dynamic route resolution, sanitization functions, toDocumentContent)
- Component tests for any new UI elements
- Tests must fail initially before implementation
```bash
pnpm test -- --run --reporter=verbose
# Note which new tests fail (others should still pass)
```

### Step 4: Implement
Critical implementation notes:

**MSW Health-Check Fallback (msw-init.tsx):**
```typescript
export function MswInit({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    async function init() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      let useMsw = true;
      if (apiUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1500);
          const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
          clearTimeout(timeout);
          useMsw = !res.ok;
        } catch {
          useMsw = true; // API offline → use MSW
        }
      }
      if (useMsw) {
        const { createMswWorker } = await import("@emerald/mocks/browser");
        const worker = createMswWorker();
        await worker.start({ onUnhandledRequest: "bypass" });
      }
      setReady(true);
    }
    init();
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
```

**SSR Server Component (page.tsx):**
- Change `apps/docs/src/app/[space]/[version]/[slug]/page.tsx` from delegating to a 'use client' component for data fetching to an async Server Component
- Fetch document data with `await fetchDocument(...)` server-side
- Pass pre-fetched data to the client component
- Add `export const revalidate = 60`

**HTML Sanitization (document-content.tsx):**
```typescript
import DOMPurify from "isomorphic-dompurify";
// In component:
const sanitized = DOMPurify.sanitize(document.body, {
  ALLOWED_TAGS: ["h1","h2","h3","h4","h5","h6","p","ul","ol","li","pre","code","table","tr","td","th","img","a","blockquote","strong","em","span","div","figure","figcaption"],
  ALLOWED_ATTR: ["href","src","alt","class","id","data-type","data-tone","colspan","rowspan"],
  FORBID_TAGS: ["script","iframe","object","embed"],
  FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onmouseout","javascript"]
});
```

**Dynamic Default Route (page.tsx at /):**
- Fetch `GET ${API_URL}/api/public/spaces/guides/versions` server-side
- Find `version.isDefault === true`
- Fetch navigation tree, get first item with slug
- Redirect to `/${space}/${version.key}/${slug}`
- Fall back to MOCKED_DEFAULT_CONTEXT if API fails

### Step 5: Run Tests (Green Phase)
```bash
pnpm test -- --run
# Must exit 0 — all 421+ tests must still pass
pnpm typecheck
# Must exit 0
pnpm lint
# Must exit 0
```

### Step 6: Manual Browser + Curl Verification
```bash
# Test SSR: document title in HTML (not just in JavaScript bundle)
curl http://localhost:3100/guides/v1/getting-started | grep -i "getting started"

# Test metadata
curl http://localhost:3100/guides/v1/getting-started | grep "og:description"

# Test sitemap
curl http://localhost:3100/sitemap.xml | grep "<url>"

# Test without API (stop it first):
# Stop API, wait 2s, reload docs → MSW data appears within 3s
```

For every manual check, record in interactiveChecks.

### Step 7: Build Verification (if SSR changes are involved)
```bash
pnpm build
# Apps/docs must build successfully
```

### Step 8: Commit

## Key Conventions

- **Server Components**: async page.tsx fetches data with `await`; client components handle interactivity only
- **MSW preservation**: never remove MSW handlers from `packages/mocks/` — they are needed for Storybook and tests
- **NEXT_PUBLIC_API_URL**: always use env var, never hardcode localhost:3333
- **Sanitization**: use isomorphic-dompurify (works in both SSR and browser)
- **Cache invalidation**: after document publish, the API must call `POST /api/revalidate` in apps/docs (secret-gated) or use Next.js `revalidatePath`
- **Do not break existing 421 tests**: run `pnpm test -- --run` before and after; count must stay same or increase

## Example Handoff

```json
{
  "salientSummary": "Implemented MSW health-check fallback in both apps: fetches /health with 1500ms timeout, activates MSW only when API is offline. Upgraded docs document page to async Server Component with ISR (revalidate=60) and cache invalidation via /api/revalidate route. Added generateMetadata with title/description/og:image and sitemap.ts excluding drafts. All 421 tests still pass.",
  "whatWasImplemented": "apps/docs/src/app/msw-init.tsx (health-check conditional), apps/workspace/src/app/msw-init.tsx (health-check conditional), apps/docs/src/app/[space]/[version]/[slug]/page.tsx (async Server Component), apps/docs/src/app/api/revalidate/route.ts (ISR invalidation endpoint), apps/docs/src/app/sitemap.ts (dynamic, published-only), apps/docs/src/app/[space]/[version]/[slug]/page.tsx (generateMetadata), apps/docs/src/modules/documentation/presentation/document-content.tsx (DOMPurify sanitization)",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm test -- --run", "exitCode": 0, "observation": "435 tests passing, 0 failures (14 new sanitization tests added)" },
      { "command": "pnpm typecheck", "exitCode": 0, "observation": "All packages clean" },
      { "command": "pnpm build", "exitCode": 0, "observation": "apps/docs built successfully" },
      { "command": "curl http://localhost:3100/guides/v1/getting-started | grep 'Getting Started'", "exitCode": 0, "observation": "Document title found in HTML source (SSR confirmed)" },
      { "command": "curl http://localhost:3100/sitemap.xml", "exitCode": 0, "observation": "Valid XML with /guides/v1/getting-started URL" }
    ],
    "interactiveChecks": [
      { "action": "Stop API, load http://localhost:3100, wait", "observed": "MSW mock data appears within 2.5s, no blank screen, no console errors" },
      { "action": "Start API, reload http://localhost:3100", "observed": "Real data from Sardius loads, network panel shows requests to localhost:3333" },
      { "action": "View page source of document page", "observed": "Document title and content text visible in HTML before JavaScript loads" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/docs/src/modules/documentation/presentation/document-content.test.tsx",
        "cases": [
          { "name": "sanitizes <script> tags from document body", "verifies": "VAL-PROD-009" },
          { "name": "sanitizes img onerror attribute", "verifies": "VAL-PROD-014" },
          { "name": "sanitizes javascript: href links", "verifies": "VAL-PROD-014" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## Browser Verification (Windows)

**Primary:** Use the `agent-browser` Skill for interactive checks.

**Fallback (if agent-browser fails with EACCES/port binding):** Write a temporary Playwright script and remove it after verification:
```typescript
// tmp-verify.ts (delete after use — must not appear in git status at commit time)
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
// ... verify behavior
await browser.close();
```

**Public endpoint payload adaptation:** `GET /api/public/*` response shapes differ from MSW mock shapes. When adding real-API connectivity, always adapt the public endpoint payload to match the existing contract used by MSW. Without adaptation, online mode may break offline fallback tests.

## When to Return to Orchestrator

- The API's revalidation webhook requires HTTPS and won't work over HTTP in dev
- pnpm build fails due to a Next.js Server Component constraint not resolvable without architecture change
- The MSW health-check causes test failures that can't be resolved without changing test setup

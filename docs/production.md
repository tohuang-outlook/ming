# Private production operations

The production target is a private Sites Cloudflare Worker using OpenNext 1.20.6 and D1. The owner-only Sites access policy protects the entire website. The app access code additionally protects paid AI requests. It is not a multi-user account system.

## Reproducible release

Use Node 24 LTS and the committed lockfile:

```sh
npm ci
npm run lint
npm test
npm run build:sites
npm audit --audit-level=moderate
```

`build:sites` builds Next with webpack, transforms it with OpenNext, and uses Wrangler's **dry-run** bundler to resolve Worker modules. It does not deploy. `dist/server/index.js` is the portable entry, `dist/client` holds static assets, and `dist/.openai/drizzle` contains migrations. Source maps are excluded from the deployment artifact.

The OpenNext adapter currently labels Node middleware support experimental. The app uses Next's nonce proxy and tests it in the actual Worker emulator, including client hydration and zero CSP violations. Re-run these tests when upgrading Next or OpenNext; do not upgrade either independently without verifying compatibility.

## Local production verification

Create an ignored `.dev.vars` containing `APP_ORIGIN=http://127.0.0.1:8787` (no real AI key needed for the offline acceptance suite). Then:

```sh
npm run db:migrate:local
npx wrangler dev dist/server/index.js --assets dist/client --port 8787
# In another terminal:
PLAYWRIGHT_PRODUCTION=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:8787 npm run test:e2e
```

The suite expects AI to be disabled and verifies its fail-closed behavior. Production AI requires a D1 binding; plain `npm start` can serve charts but intentionally cannot bypass durable budgets.

## Required hosting configuration

- Preserve the existing project ID and owner-only access policy.
- D1 logical binding `DB`; Sites provisions the physical database and applies the committed generated migration. It stores four aggregate request counters only, never profiles, charts, prompts, IP addresses or API keys.
- `APP_ORIGIN`: exact HTTPS production origin, no trailing slash.
- `DEEPSEEK_API_KEY`: secret, server-only, obtained through the user's DeepSeek account. Do not reuse an OpenAI key.
- `AI_ACCESS_TOKEN`: separate cryptographically random secret of at least 24 characters. Share this app code only with the owner through a secure channel, never put the API key in the settings form.
- `DEEPSEEK_MODEL`: an available structured-output model; default `deepseek-flash`.

Changing runtime configuration requires redeploying the saved version. Do not put secrets into Git, archives, screenshots, support logs or `.openai/hosting.json`. DeepSeek synthetic I Ching, Bazi and Zi Wei calls passed schema/fact-reference checks. Repeat hosted acceptance after any provider/model change.

## Operations and recovery

`GET /api/health` is a no-store liveness endpoint; a 200 response does **not** certify DeepSeek availability. Smoke-test the home page, profile/chart flow and one real AI interpretation after deployment. Verify an unauthenticated visitor cannot open the private website. Failed upstream AI responses become a generic 502 without provider details; existing charts remain usable.

The atomic D1 limit allows at most 8 AI attempts/minute and 40/day, and 5 access-code attempts/minute and 100/day, shared by the private owner across all Workers. Daily windows reset at UTC midnight. Failed AI attempts count toward the cap; automatic retries are disabled. Limits bound requests, not currency: set a separate provider project spending budget. A missing/unavailable D1 service returns 503 and never falls back to volatile limits in production.

Rotate the DeepSeek key in its provider and update the hosting secret. Rotate `AI_ACCESS_TOKEN` to invalidate all existing sessions; the settings page can also clear this browser's session. Sessions expire after one hour. Never log request bodies or interpreted chart text.

Before a release, export device backups. To recover local data, Settings → 從備份還原 → select the JSON → review counts → confirm replacement. Invalid versions, invalid chart schemas, duplicate record IDs and oversized files are rejected before writing. A failed storage write does not pre-delete the existing store. Backups contain personal data and require private storage.

For rollback, redeploy a previously validated saved Sites version using its exact returned ID. Database changes must remain backward-compatible; never edit an already applied migration. The first migration only adds the counter table. Recheck `/api/health`, CSP/hydration, AI authentication and a real interpretation after rollback. No deployment or migration deletion is required for rollback.

The GitHub workflow runs install/audit/lint/unit/build and production-Worker browser checks if this repository is mirrored to GitHub. Its existence is not a claim that a hosted CI run has occurred.

Local environment files are stripped from OpenNext compiled environment metadata before packaging. The release scanner blocks archives containing local secret values. Use `npm run build:sites` for production packaging, not an unprocessed OpenNext directory.

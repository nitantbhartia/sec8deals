# sec8deals

Open-source Section 8 sourcing and underwriting dashboard.

## What it does

- Ingests property feed data from configurable sources (`AFFORDABLE_HOUSING_FEED_URL`, `HUDDATA_FEED_URL`)
- Scores each deal from `A` to `F` using cap rate, cash-on-cash, annual cash flow, GRM, and market health
- Ranks top deals and top markets
- Shows dashboard at `/section8`
- Supports optional daily top-10 email digest via Resend
- Supports daily automation via GitHub Actions (`.github/workflows/section8-daily.yml`)

By default it runs source-only mode (no synthetic listings). Demo fallback is optional via env var.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000/section8](http://localhost:3000/section8)

## Environment variables

Copy into `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SECTION8_CRON_SECRET=replace_me
SECTION8_ENABLE_DEMO_FALLBACK=false
SECTION8_ENABLE_CRAWL4AI=false
SECTION8_DATA_DIR=/tmp/sec8deals/section8

# Optional source adapters
AFFORDABLE_HOUSING_FEED_URL=
AFFORDABLE_HOUSING_FEED_TOKEN=
HUDDATA_FEED_URL=
HUDDATA_FEED_KEY=

# Optional Crawl4AI URL seeds (used only when *_FEED_URL is unset and SECTION8_ENABLE_CRAWL4AI=true)
AFFORDABLE_HOUSING_SCRAPE_URLS=
HUDDATA_SCRAPE_URLS=

# Optional email digest via Resend
RESEND_API_KEY=
SECTION8_EMAIL_FROM=deals@yourdomain.com
SECTION8_EMAIL_TO=you@yourdomain.com
```

## API endpoints

- `GET /api/section8/deals` - current scored dataset
- `POST /api/section8/run` - refresh ingestion + scoring
- `POST /api/section8/email` - send top-10 digest (if email env vars are set)

Use `x-cron-secret: <SECTION8_CRON_SECRET>` for protected POST endpoints.

## Deploy to Railway

1. Create a new Railway project from this repo.
2. Ensure `railway.json` and `Dockerfile` are used.
3. Set the environment variables listed above.
4. Deploy.
5. Set `SECTION8_APP_URL` + `SECTION8_CRON_SECRET` as GitHub repo secrets for daily workflow.

## Notes on data sources

- Respect each source website/API terms of service and robots policies.
- Prefer official APIs or licensed feeds for production ingestion.
- This project provides adapter hooks; you can swap in RapidAPI or proprietary connectors.
- `demo` source is only used when `SECTION8_ENABLE_DEMO_FALLBACK=true`.
- Crawl4AI mode is optional and requires Python + crawl4ai installed in the runtime.

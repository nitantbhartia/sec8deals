# sec8deals

Open-source Section 8 sourcing and underwriting dashboard.

## What it does

- Ingests property feed data from configurable sources (`AFFORDABLE_HOUSING_FEED_URL`, `HUDDATA_FEED_URL`)
- Scores each deal from `A` to `F` using cap rate, cash-on-cash, annual cash flow, GRM, and market health
- Ranks top deals and top markets
- Shows dashboard at `/section8`
- Supports optional daily top-10 email digest via Resend
- Supports daily automation via GitHub Actions (`.github/workflows/section8-daily.yml`)

If no external feed is configured, it auto-falls back to demo market data so the app remains usable.

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

# Optional source adapters
AFFORDABLE_HOUSING_FEED_URL=
AFFORDABLE_HOUSING_FEED_TOKEN=
HUDDATA_FEED_URL=
HUDDATA_FEED_KEY=

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

# Product Price Tracker

A robust, full-stack application built to reliably scrape and track product prices from the iNE mock store.

## Features
- Search products directly from the store catalog
- Dashboard to view all tracked products and latest prices
- Detailed product view with price history charts and detailed scrape logs
- Highly reliable scraper with exponential backoff designed to handle client-side obfuscation
- Secret-protected cron endpoint for automated scraping

## Setup Instructions

### Prerequisites
- Node.js >= 18
- PostgreSQL Database (e.g., Supabase)

### Backend Setup (Local & Render)
1. `cd backend`
2. `npm install`
3. Create a `.env` file with `DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"` and `CRON_SECRET="your-secure-secret"`
4. Run `npx prisma db push` to initialize the database schema.
5. Local Dev: Run `npm run dev` to start the server via `tsx`.
6. **Deployment (Render)**: The backend is fully configured for Render via the included `Dockerfile`. It uses `mcr.microsoft.com/playwright:v1.63.0-jammy` to ensure headless Chromium matches the exact `playwright` npm package version. Prisma CLI and TypeScript are installed globally in the image to bypass `node_modules/.bin` execution permission errors (`TS6133`/`Permission denied`). The project strictly follows `NodeNext` ESM module resolution.

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Start the dev server: `npm run dev`

### Cron Job Setup (cron-job.org)
To run the automated scrape every 2 hours:
1. Create an account on cron-job.org
2. Create a new cron job pointing to `https://your-backend-url.com/api/cron/scrape`
3. Set the schedule to **Every 2 hours**.
4. Set the HTTP Method to **POST**.
5. Add a Header:
   - Key: `Authorization`
   - Value: `Bearer <your-CRON_SECRET>`

## Environment Variables
- `DATABASE_URL`: Connection string to your Supabase PostgreSQL instance.
- `CRON_SECRET`: Secret token protecting the `/api/cron/scrape` endpoint.
- `PORT`: (Optional) Port for the Express server to run on (default 3000).

## Design Decisions
- **Scraper Reliability**: The iNE mock store employs strict anti-bot mechanisms requiring specific, prolonged mouse movements. The scraper simulates this directly using `page.evaluate` and `dispatchEvent` to guarantee execution context.
- **Robust Extraction**: CSS selectors are prone to change. The extraction logic waits for the anti-bot button to disappear, then continuously polls the inner text of the `.price-block` container until the "Loading" placeholder resolves into a regex-matched price.
- **Transparent Logging**: Failed scrapes do not store empty or guessed values into the `PriceHistory` table. Instead, exact failure reasons (like timeouts or missing bounding boxes) are logged in `ScrapeLog` and surfaced transparently on the frontend.

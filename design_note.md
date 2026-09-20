# Design Note: Architecture, Reliability, and Lessons Learned

## 1. The Deployment Saga: Docker & Prisma on Render
Deploying a Playwright-based scraper alongside a Prisma database connection proved exceptionally challenging. 
The initial deployment failed because Render's native Node environments lack the system dependencies required by Playwright. 
When we switched to a custom `Dockerfile` based on `mcr.microsoft.com/playwright`, we encountered severe permission issues (`Permission denied`) when trying to execute local `node_modules/.bin/prisma` or `tsc` binaries within the container, compounded by ESM module resolution errors.

**The Fix**: We created a robust `Dockerfile` that explicitly uses `mcr.microsoft.com/playwright:v1.63.0-jammy`, globally installs `typescript` and `prisma` to bypass the `.bin` permission issues, explicitly generates the Prisma client during the build step, and strictly enforces `NodeNext` ESM rules in `tsconfig.json`.

## 2. Scraper Reliability & Anti-Bot Mouse-Jitter
The iNE mock store implements strict client-side anti-bot mechanisms. A simple HTTP GET request returns an empty HTML shell. The price is hidden behind a "Reveal price" button that remains disabled until it observes a realistic sequence of trusted `mouseenter` and `mousemove` events spanning more than 600ms.

**The Fix**: Simple linear movements proved flaky. We engineered a mathematical circular mouse-jitter solution using `Math.sin`/`Math.cos` with a 10px radius, strictly clamped within the `.price-block`'s bounding box to guarantee the pointer never leaves the element. This loop executes 30 times with a 50ms timeout between steps, producing 1,500ms of authentic, trusted `mousemove` events. 

## 3. Robust Extraction & Immediate Scrape
Initially, extracting the price relied on brittle CSS selectors. We also encountered a UX issue where tracking a new product wouldn't show a price until the next 2-hour cron job fired. Furthermore, the scraper occasionally extracted the "wrong price" if it read the DOM too early.

**The Fix**: 
- We implemented text-based polling: the scraper waits for the button to hide, then polls `.price-block`'s innerText until "Loading" disappears and a robust Regex successfully matches the price format.
- We implemented an immediate-scrape-on-track feature. The `/api/products` POST endpoint now instantly calls the scraper for the newly tracked product, ensuring immediate feedback on the dashboard.

## 4. UI Overhaul & UX Polish
The frontend underwent a massive visual overhaul, moving away from a basic look to a premium aesthetic.
We implemented a system-wide Glassmorphism design using translucent panels (`backdrop-blur`), modern fonts (Inter & Space Grotesk), dynamic gradients, and smooth hover micro-animations. 
We introduced a full Light/Dark mode toggle (persisted via `localStorage`) and enhanced the search and dashboard pages with category chips, product images, and fallback emoji icons for unrecognized categories.

## 5. Search Filtering Enhancements
We discovered a bug where full-word or multi-character search queries (like "toaster") were returning zero results, while single letters worked. 
This wasn't a UI bug, but rather a pagination flaw: the backend was only fetching the first 50 items (`pageSize=50`) from the mock store, leaving most of the catalog unsearchable. We fixed this by bumping `pageSize` to `1000` to index the entire catalog for client-side filtering. 
We also overhauled the filtering UI, removing redundant dropdown filters and moving towards a more streamlined Category Chip design.

---

## What AI Got Wrong and How It Was Corrected

Throughout this journey, I (the AI) made several missteps that required manual correction or iterative debugging:

1. **The Silent Vercel Build Failures (22-Hour Outage)**
   **The Mistake**: Over a 22-hour stretch encompassing 10+ consecutive pushes, the Vercel frontend deployment silently failed. I repeatedly pushed functional logic fixes (like setting `VITE_API_URL`) but completely ignored lingering TypeScript errors (`TS2503 Cannot find namespace 'NodeJS'`, `TS2322 Ref type mismatch`, and unused imports). Because the app worked in the local dev server (`npm run dev`), I falsely assumed the production build was fine and confidently told the user the issue was resolved without actually verifying it.
   **The Correction**: I was strictly instructed to run the actual production build command (`npm run build`) locally before declaring success. By doing so, I immediately saw the TypeScript compilation errors that were failing Vercel's strict CI pipeline. I fixed the Ref mismatches, replaced `NodeJS.Timeout` with `ReturnType<typeof setTimeout>`, cleaned up dead variables from a previous filter refactor, and finally produced a clean exit code 0.

2. **Naïve Playwright Interactions**
   **The Mistake**: I initially assumed Playwright's `locator.hover()` or a simple `mouse.move(x,y)` would instantly bypass the anti-bot. I also passed a recursive arrow function into `page.evaluate`, completely forgetting that the TypeScript transpiler injects a `__name` helper, which instantly crashed the browser context with a `ReferenceError`.
   **The Correction**: I had to discard the naïve approach, write the mathematical mouse-jitter loop, and replace the injected function with a simple Regex `innerHTML` string replacement.

3. **Incomplete Refactoring (Dead Code)**
   **The Mistake**: When asked to remove the Category and Brand filter dropdowns from the UI, I deleted the JSX but sloppily left behind the `useState` declarations and the filtering logic array methods. This directly contributed to the Vercel build failures mentioned above.
   **The Correction**: I had to go back, carefully trace the dependencies of the deleted UI, remove the unused `selectedBrand` references entirely, and correctly restore the `selectedCategory` state that was still required by the Category Chips UI.

# Design Note: Scraper Reliability

## Challenge
The iNE mock store implements strict client-side anti-bot mechanisms. A simple HTTP GET request returns an empty HTML shell. Furthermore, the product price is hidden behind a "Reveal price" button. This button is heavily protected: it remains disabled until it observes a realistic sequence of trusted `mouseenter` and `mousemove` events over the `.price-block` spanning more than 600ms.

## Implementation Details

1. **Simulating Human Interaction**: 
   The initial attempt using `playwright`'s `mouse.move` natively failed in headless mode because of how the coordinates were resolved and how fast the steps were executed. A subsequent attempt using `page.evaluate()` to dispatch fake events failed in headed mode because the `isTrusted` flag was falsy, or due to TypeScript compiler emitting a `__name` helper inside the `evaluate` function which crashed in the browser context.
   
   **The Fix**: I reverted to native Playwright trusted interactions, specifically calling `await priceBlock.scrollIntoViewIfNeeded()` and `await priceBlock.hover()`. However, simple linear movements proved flaky or drifted outside narrow elements. The final robust solution draws a perfect mathematical circle (`Math.sin`/`Math.cos` with a 10px radius) around the exact center of `.price-block`. The coordinates are strictly clamped to `Math.max(box.x + 5, ...)` and `Math.min(box.x + box.width - 5, ...)` to guarantee the pointer never leaves the element. This loop executes 30 times with a `waitForTimeout(50)` between steps, producing 1,500ms of authentic, trusted `mousemove` events. Finally, the timeout for `page.waitForFunction` (checking the DOM `disabled` property) was doubled to 10 seconds to tolerate extreme backend lag on the mock store's challenge verification.

2. **Robust Extraction**:
   Once the button is clicked, the UI changes to "Loading current price…" before eventually rendering the price into the DOM. Waiting for strict CSS selectors (like `.price-value`) timed out because the site dynamically altered the DOM tree instead of just updating text.
   
   **The Fix**: Instead of relying on brittle CSS selectors, the scraper waits for the "Reveal price" button to become `hidden`. It then falls into a polling loop, checking `priceBlock.innerText()` every 500ms until the text no longer includes "Loading" and matches a robust Regex `/(?:₹|\$|Rs\.?|INR)?\s*([0-9,]+(\.[0-9]{1,2})?)/i`.

3. **Honest Scraping & Backoff**:
   The scraper explicitly tracks `attempt_count` and uses an exponential backoff array `[0, 2000, 5000, 10000]`. If all retries fail, it gracefully returns a `failed` status and the exact stringified Error. The API route receives this and writes the failure to `ScrapeLog` *without* creating a hallucinated `PriceHistory` row.

## What I Got Wrong Initially
- I assumed Playwright's `locator.hover()` or a simple `mouse.move(x,y)` would instantly bypass the anti-bot. I had to iteratively refine it to generate multiple incremental steps over time.
- I assumed the `.price-value` class would be present after clicking the button, but the DOM structure changed during the loading state, causing a timeout. I corrected this by using text-based polling.
- I passed a recursive arrow function into `page.evaluate` to strip text nodes for structure hashing. The TypeScript transpiler (`tsx`) injected a `__name` helper which caused a `ReferenceError` inside the browser context. I fixed this by using a simple Regex `replace(/>[^<]*</g, '><')` directly on `innerHTML`.

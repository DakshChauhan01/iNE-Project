import { chromium, type Page } from 'playwright';

/** One row that gets written to scrape_log for each individual attempt */
export interface AttemptLog {
  status: 'success' | 'retried' | 'failed';
  attempt_number: number;
  started_at: Date;
  duration_ms: number;
  method_used: string;
  error_message: string | null;
  structure_changed: boolean;
}

export interface ScrapeResult {
  /** overall outcome — 'success', 'retried' (succeeded after ≥1 failure), or 'failed' */
  final_status: 'success' | 'retried' | 'failed';
  /** one log entry per attempt, oldest first */
  attempts: AttemptLog[];
  total_duration_ms: number;
  price: number | null;
  in_stock: boolean;
  image_url: string | null;
}

const BACKOFF_DELAYS = [0, 2000, 5000, 10000];

async function attemptScrape(page: Page, attemptCount: number): Promise<{ price: number; in_stock: boolean; structureHash: string; image_url: string | null }> {
  if (process.env.FORCE_FAILURE === 'true' && attemptCount === 1) {
    console.log('[Scraper] FORCE_FAILURE is enabled. Simulating a timeout on attempt 1...');
    await page.waitForSelector('.non-existent-fake-selector', { timeout: 2000 });
  }

  // Wait for the price block to appear
  const priceBlock = page.locator('.price-block');
  await priceBlock.waitFor({ state: 'attached', timeout: 10000 });
  await priceBlock.scrollIntoViewIfNeeded();
  await priceBlock.hover();
  
  const box = await priceBlock.boundingBox();
  if (box) {
     const centerX = box.x + box.width / 2;
     const centerY = box.y + box.height / 2;
     for (let i = 0; i < 30; i++) {
         const offsetX = Math.sin(i) * 10;
         const offsetY = Math.cos(i) * 10;
         
         const safeX = Math.max(box.x + 5, Math.min(box.x + box.width - 5, centerX + offsetX));
         const safeY = Math.max(box.y + 5, Math.min(box.y + box.height - 5, centerY + offsetY));
         
         await page.mouse.move(safeX, safeY);
         await page.waitForTimeout(50);
     }
  }

  // Now the 'Reveal price' button should be enabled
  const revealButton = page.locator('button[aria-label="Reveal price"]');
  await revealButton.waitFor({ state: 'visible', timeout: 10000 });
  
  // Wait for it to become enabled (check DOM property, not attribute)
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel) as HTMLButtonElement;
      return el && el.disabled === false;
    },
    'button[aria-label="Reveal price"]',
    { timeout: 10000 }
  );
  
  // Click to fetch the actual price
  await revealButton.click();

  // Wait for the button to disappear, which means price has loaded
  await revealButton.waitFor({ state: 'hidden', timeout: 10000 });

  // Get the entire text of the price block to avoid strict CSS selector dependency
  let blockText = '';
  const startWait = Date.now();
  while (Date.now() - startWait < 10000) {
    blockText = await priceBlock.innerText();
    if (blockText && !blockText.includes('Loading') && blockText.match(/(?:₹|\$|Rs\.?|INR)?\s*([0-9,]+(\.[0-9]{1,2})?)/i)) {
      break;
    }
    await page.waitForTimeout(500);
  }
  
  if (!blockText) {
    throw new Error('Price block is empty after reveal.');
  }

  // Use regex to find the price and stock
  // E.g. "₹ 24,999" or "Price: 24999"
  const priceMatch = blockText.match(/(?:₹|\$|Rs\.?|INR)?\s*([0-9,]+(\.[0-9]{1,2})?)/i);
  let numericPrice = null;
  
  if (priceMatch && priceMatch[1]) {
    numericPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
  }

  if (numericPrice === null || isNaN(numericPrice)) {
    throw new Error(`Extracted price is not a valid number: ${blockText}`);
  }

  const inStock = blockText.toLowerCase().includes('in stock') || !blockText.toLowerCase().includes('out of stock');
  
  // Create a structure hash to detect page layout changes
  // We just hash the HTML structure of the body or main element by stripping out text and attributes
  const structureHtml = await page.evaluate(() => {
    return document.body.innerHTML.replace(/>[^<]*</g, '><');
  });
  
  // Simple hash function for string
  let hash = 0;
  for (let i = 0; i < structureHtml.length; i++) {
    hash = ((hash << 5) - hash) + structureHtml.charCodeAt(i);
    hash |= 0; 
  }

  // Extract product image URL if available
  let imageUrl = null;
  try {
    const imgLocator = page.locator('img').first();
    if (await imgLocator.count() > 0) {
      imageUrl = await imgLocator.getAttribute('src');
    }
  } catch (e) {
    // Ignore if image extraction fails
  }

  return {
    price: numericPrice,
    in_stock: inStock,
    structureHash: hash.toString(),
    image_url: imageUrl
  };
}



export async function scrapeProduct(
  productId: string | number,
  previousStructureHash?: string | null,
  headed: boolean = false,
): Promise<ScrapeResult> {
  const totalStart = Date.now();
  const attemptLogs: AttemptLog[] = [];
  let lastError: Error | null = null;
  let finalPrice: number | null = null;
  let finalInStock = false;
  let finalImageUrl: string | null = null;

  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 500 : 0 });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    for (let i = 0; i < BACKOFF_DELAYS.length; i++) {
      const attemptNumber = i + 1;
      const delay = BACKOFF_DELAYS[i];

      const safeDelay: number = delay ?? 0;

      if (safeDelay > 0) {
        console.log(`[Scraper] Waiting ${safeDelay}ms before attempt ${attemptNumber}...`);
        await new Promise(res => setTimeout(res, safeDelay));
      }

      const attemptStart = Date.now();
      const page = await context.newPage();

      try {
        await page.goto(
          `https://demo.inelabteamdev.com/product/${productId}`,
          { waitUntil: 'domcontentloaded', timeout: 15000 },
        );

        const result = await attemptScrape(page, attemptNumber);
        const structureChanged = previousStructureHash
          ? result.structureHash !== previousStructureHash
          : false;

        await page.close();

        finalPrice    = result.price;
        finalInStock  = result.in_stock;
        finalImageUrl = result.image_url;

        // Log this specific attempt as successful
        attemptLogs.push({
          status: attemptNumber === 1 ? 'success' : 'retried',
          attempt_number: attemptNumber,
          started_at: new Date(attemptStart),
          duration_ms: Date.now() - attemptStart,
          method_used: 'browser',
          error_message: null,
          structure_changed: structureChanged,
        });

        const final_status = attemptNumber === 1 ? 'success' : 'retried';
        return {
          final_status,
          attempts: attemptLogs,
          total_duration_ms: Date.now() - totalStart,
          price: finalPrice,
          in_stock: finalInStock,
          image_url: finalImageUrl,
        };
      } catch (err: any) {
        lastError = err;
        await page.close();

        // Log this individual failed attempt
        attemptLogs.push({
          status: 'failed',
          attempt_number: attemptNumber,
          started_at: new Date(attemptStart),
          duration_ms: Date.now() - attemptStart,
          method_used: 'browser',
          error_message: err.message ?? 'Unknown error',
          structure_changed: false,
        });

        console.log(`[Scraper] Attempt ${attemptNumber} failed: ${err.message}`);
        // continue to next retry
      }
    }
  } finally {
    await browser.close();
  }

  // All retries exhausted — final result is failed
  return {
    final_status: 'failed',
    attempts: attemptLogs,
    total_duration_ms: Date.now() - totalStart,
    price: null,
    in_stock: false,
    image_url: null,
  };
}

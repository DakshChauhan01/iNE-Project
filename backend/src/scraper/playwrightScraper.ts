import { chromium, Page } from 'playwright';

export interface ScrapeResult {
  status: 'success' | 'retried' | 'failed';
  attempt_count: number;
  duration_ms: number;
  method_used: string;
  error_message: string | null;
  structure_changed: boolean;
  price: number | null;
  in_stock: boolean;
}

const BACKOFF_DELAYS = [0, 2000, 5000, 10000];

async function attemptScrape(page: Page): Promise<{ price: number; in_stock: boolean; structureHash: string }> {
  // Wait for the price block to appear
  const priceBlock = page.locator('.price-block');
  await priceBlock.waitFor({ state: 'attached', timeout: 10000 });
  await priceBlock.scrollIntoViewIfNeeded();
  await priceBlock.hover();
  
  const box = await priceBlock.boundingBox();
  if (box) {
     for (let i = 0; i < 20; i++) {
         await page.mouse.move(box.x + box.width/2 + i*2, box.y + box.height/2 + (i%2)*2);
         await page.waitForTimeout(50);
     }
  }

  // Now the 'Reveal price' button should be enabled
  const revealButton = page.locator('button[aria-label="Reveal price"]');
  await revealButton.waitFor({ state: 'visible', timeout: 5000 });
  
  // Wait for it to become enabled
  await expectEnabled(page, 'button[aria-label="Reveal price"]', 5000);
  
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

  return {
    price: numericPrice,
    in_stock: inStock,
    structureHash: hash.toString()
  };
}

async function expectEnabled(page: Page, selector: string, timeout: number) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const isDisabled = await page.$eval(selector, (el) => (el as HTMLButtonElement).disabled);
    if (!isDisabled) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`Element ${selector} did not become enabled within ${timeout}ms.`);
}

export async function scrapeProduct(productId: string | number, previousStructureHash?: string | null, headed: boolean = false): Promise<ScrapeResult> {
  const startTime = Date.now();
  let attemptCount = 0;
  let lastError: Error | null = null;
  
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 500 : 0 });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    while (attemptCount < BACKOFF_DELAYS.length) {
      if (attemptCount > 0) {
        const delay = BACKOFF_DELAYS[attemptCount];
        console.log(`[Scraper] Retrying in ${delay}ms... (Attempt ${attemptCount + 1})`);
        await new Promise(res => setTimeout(res, delay));
      }
      
      attemptCount++;
      const page = await context.newPage();
      
      try {
        await page.goto(`https://demo.inelabteamdev.com/product/${productId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        const result = await attemptScrape(page);
        
        const structureChanged = previousStructureHash ? result.structureHash !== previousStructureHash : false;
        
        await page.close();
        
        return {
          status: attemptCount === 1 ? 'success' : 'retried',
          attempt_count: attemptCount,
          duration_ms: Date.now() - startTime,
          method_used: 'browser',
          error_message: null,
          structure_changed: structureChanged,
          price: result.price,
          in_stock: result.in_stock,
        };
      } catch (err: any) {
        lastError = err;
        await page.close();
        // Continue to retry loop
      }
    }
  } finally {
    await browser.close();
  }

  // If we exhaust all retries:
  return {
    status: 'failed',
    attempt_count: attemptCount,
    duration_ms: Date.now() - startTime,
    method_used: 'browser',
    error_message: lastError ? lastError.message : 'Unknown error',
    structure_changed: false,
    price: null,
    in_stock: false
  };
}

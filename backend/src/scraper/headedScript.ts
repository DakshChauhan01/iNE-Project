import { scrapeProduct } from './playwrightScraper';

const args = process.argv.slice(2);
const productId = args[0] || '264';

async function run() {
  console.log(`Starting observable headed scraper for product ID: ${productId}`);
  try {
    const result = await scrapeProduct(productId, null, true);
    console.log('--- Scrape Result ---');
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'failed') {
      console.error(`Scrape failed: ${result.error_message}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during execution:', err);
    process.exit(1);
  }
}

run();

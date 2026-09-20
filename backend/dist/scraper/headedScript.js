import { scrapeProduct } from './playwrightScraper.js';
const args = process.argv.slice(2);
const productId = args[0] || '264';
async function run() {
    console.log(`Starting observable headed scraper for product ID: ${productId}`);
    try {
        const result = await scrapeProduct(productId, null, true);
        console.log('--- Scrape Result ---');
        console.log(JSON.stringify(result, null, 2));
        if (result.final_status === 'failed') {
            const lastAttempt = result.attempts.at(-1);
            console.error(`Scrape failed: ${lastAttempt?.error_message ?? 'Unknown error'}`);
            process.exit(1);
        }
    }
    catch (err) {
        console.error('Fatal error during execution:', err);
        process.exit(1);
    }
}
run();
//# sourceMappingURL=headedScript.js.map
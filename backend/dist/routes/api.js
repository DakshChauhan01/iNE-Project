import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { scrapeProduct } from '../scraper/playwrightScraper.js';
const router = Router();
const prisma = new PrismaClient();
// GET /api/search?q=
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q?.toLowerCase() || '';
        const response = await fetch('https://demo.inelabteamdev.com/api/catalog?page=1&pageSize=50');
        const data = await response.json();
        if (!data.items) {
            return res.json({ items: [] });
        }
        const filtered = data.items.filter((item) => item.name.toLowerCase().includes(q) ||
            item.brand.toLowerCase().includes(q));
        res.json({ items: filtered });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/products
router.get('/products', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                price_histories: {
                    orderBy: { scraped_at: 'desc' },
                    take: 1
                }
            }
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/products
router.post('/products', async (req, res) => {
    try {
        const { name, store_url, store_product_id, image_url } = req.body;
        const existing = await prisma.product.findUnique({ where: { store_url } });
        if (existing) {
            return res.status(400).json({ error: 'Product already tracked' });
        }
        const product = await prisma.product.create({
            data: { name, store_url, store_product_id, image_url }
        });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/products/:id
router.delete('/products/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.product.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/products/:id/history
router.get('/products/:id/history', async (req, res) => {
    try {
        const product_id = parseInt(req.params.id);
        const history = await prisma.priceHistory.findMany({
            where: { product_id },
            orderBy: { scraped_at: 'desc' },
            take: 100
        });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/products/:id/logs
router.get('/products/:id/logs', async (req, res) => {
    try {
        const product_id = parseInt(req.params.id);
        const logs = await prisma.scrapeLog.findMany({
            where: { product_id },
            orderBy: { started_at: 'desc' },
            take: 50
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
async function runScrapeForProduct(productId, storeProductId) {
    // get previous log for structure hash comparison
    const lastLog = await prisma.scrapeLog.findFirst({
        where: { product_id: productId, status: { in: ['success', 'retried'] } },
        orderBy: { started_at: 'desc' }
    });
    // NOTE: In a real system, we might store the structure hash on the product or in the log.
    // For simplicity here, we rely on the scraper logic. 
    const result = await scrapeProduct(storeProductId);
    const log = await prisma.scrapeLog.create({
        data: {
            product_id: productId,
            finished_at: new Date(),
            status: result.status,
            attempt_count: result.attempt_count,
            duration_ms: result.duration_ms,
            method_used: result.method_used,
            error_message: result.error_message,
            structure_changed: result.structure_changed
        }
    });
    if (result.status !== 'failed' && result.price !== null) {
        await prisma.priceHistory.create({
            data: {
                product_id: productId,
                price: result.price,
                in_stock: result.in_stock,
                method: result.method_used
            }
        });
    }
    return { log, result };
}
// POST /api/products/:id/scrape
router.post('/products/:id/scrape', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const scrapeRes = await runScrapeForProduct(product.id, product.store_product_id);
        res.json(scrapeRes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/cron/scrape
router.post('/cron/scrape', async (req, res) => {
    const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${CRON_SECRET}` && req.headers['x-cron-secret'] !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Send immediate 200 to cron job provider, then do work in background.
    res.status(200).json({ message: 'Scrape job started' });
    try {
        const products = await prisma.product.findMany({ where: { is_active: true } });
        for (const product of products) {
            console.log(`Cron: Scraping product ${product.id}...`);
            await runScrapeForProduct(product.id, product.store_product_id);
            // Wait 3 seconds between requests to avoid overloading the site
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        console.log('Cron: Scraping finished.');
    }
    catch (err) {
        console.error('Cron job error:', err);
    }
});
export default router;
//# sourceMappingURL=api.js.map
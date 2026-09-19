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
export declare function scrapeProduct(productId: string | number, previousStructureHash?: string | null, headed?: boolean): Promise<ScrapeResult>;
//# sourceMappingURL=playwrightScraper.d.ts.map
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
export declare function scrapeProduct(productId: string | number, previousStructureHash?: string | null, headed?: boolean): Promise<ScrapeResult>;
//# sourceMappingURL=playwrightScraper.d.ts.map
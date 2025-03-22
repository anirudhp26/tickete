import { WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { DbService } from "../db/db.service";
export declare class FetcherProcessor extends WorkerHost {
    private readonly prisma;
    private readonly redis;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly logger;
    private readonly maxTokens;
    private readonly refillRate;
    private readonly refillInterval;
    private readonly key;
    constructor(prisma: DbService);
    private initializeTokens;
    private acquireToken;
    process(job: Job<any, any, string>): Promise<any>;
    private fetchAndStoreInventory;
    private processInventoryData;
    private getFetchTypeForDate;
    private getDaysOfWeekForProduct;
}

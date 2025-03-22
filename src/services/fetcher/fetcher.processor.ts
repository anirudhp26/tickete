import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { format } from "date-fns";
import { Slot } from "./fetcher.interface";
import { DbService } from "../db/db.service";
import { Logger } from "@nestjs/common";
import { DaysInWeek, FetchTypes } from "@prisma/client";
import Redis from "ioredis";

@Processor('jobs')
export class FetcherProcessor extends WorkerHost {
    private readonly redis: Redis;
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly logger = new Logger(FetcherProcessor.name);
    private readonly maxTokens = 30;
    private readonly refillRate = 30;
    private readonly refillInterval = 60000;
    private readonly key = 'rate_limiter:tokens';

    constructor(
        private readonly prisma: DbService,
    ) {
        super();
        if (!process.env.PARTNER_API_KEY) {
            throw new Error('PARTNER_API_KEY is required');
        }
        if (!process.env.PARTNER_API_BASE_URL) {
            throw new Error('PARTNER_API_BASE_URL is required');
        }
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL is required');
        }
        this.apiKey = process.env.PARTNER_API_KEY;
        this.baseUrl = process.env.PARTNER_API_BASE_URL;
        this.redis = new Redis(process.env.REDIS_URL);
    }

    private async initializeTokens() {
        const exists = await this.redis.exists(this.key);
        if (!exists) {
            await this.redis.set(this.key, this.maxTokens, 'PX', this.refillInterval);
        }
    }

    private async acquireToken(): Promise<void> {
        const now = Date.now();
        const lastRefill = Number(await this.redis.get(`${this.key}:lastRefill`)) || now;

        // Calculate new tokens based on elapsed time
        const timePassed = now - lastRefill;
        const newTokens = (timePassed * this.refillRate) / this.refillInterval;

        // Get current tokens from Redis and update
        const currentTokens = Math.min(this.maxTokens, (Number(await this.redis.get(this.key)) || 0) + newTokens);
        await this.redis.set(this.key, currentTokens, 'PX', this.refillInterval);
        await this.redis.set(`${this.key}:lastRefill`, now);

        if (currentTokens < 1) {
            const waitTime = Math.ceil((1 - currentTokens) * this.refillInterval / this.refillRate);
            this.logger.warn(`Rate limit exceeded. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            await this.redis.set(this.key, 1, 'PX', this.refillInterval); // Reset to 1 token
        }

        // Consume 1 token
        await this.redis.decr(this.key);

        this.logger.log(`Token acquired, ${Math.floor(currentTokens - 1)} tokens remaining`);
    }

    async process(job: Job<any, any, string>): Promise<any> {
        await this.acquireToken();
        this.logger.log(`Processing job ${job.id}`);
        const { productId, date } = job.data;
        await this.fetchAndStoreInventory(productId, date);
    }

    private async fetchAndStoreInventory(productId: number, date: string): Promise<void> {
        try {
            const url = `${this.baseUrl}/ep1`;
            const response = await fetch(url, {
                headers: {
                    'x-api-key': `${this.apiKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch inventory for product ${productId}, date ${date}`);
            }

            // const slots = await response.json() as Slot[];
            // await this.processInventoryData(productId, date, slots);
        } catch (error) {
            this.logger.error(`Error fetching inventory for product ${productId}, date ${date}`, error);
        }
    }

    private async processInventoryData(productId: number, date: string, data: Slot[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.upsert({
                where: { id: productId },
                update: {},
                create: {
                    id: productId,
                    availableDaysOfWeek: this.getDaysOfWeekForProduct(productId) as DaysInWeek[],
                    hasMultipleTimeSlots: productId === 14 ? true : false,
                },
            });

            const availableDate = await tx.availableDate.upsert({
                where: {
                    unique_product_date: {
                        productId: product.id,
                        date: new Date(date),
                    }
                },
                update: {},
                create: {
                    productId,
                    date: new Date(date),
                    originalPrice: 0,
                    finalPrice: 0,
                    currencyCode: 'SGD',
                },
            });

            await Promise.all(data.map(async (slot) => {
                const timeSlot = await tx.timeSlot.upsert({
                    where: {
                        unique_product_timeslot: {
                            productId: product.id,
                            startTime: slot.startTime,
                        }
                    },
                    update: {
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    },
                    create: {
                        productId: product.id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    },
                });
                const timeSlotAvailability = await tx.timeSlotAvailability.upsert({
                    where: {
                        unique_availableDate_timeSlot: {
                            timeSlotId: timeSlot.id,
                            availableDateId: availableDate.id,
                        }
                    },
                    update: {
                        currencyCode: slot.currencyCode,
                        remaining: slot.remaining,
                    },
                    create: {
                        availableDateId: availableDate.id,
                        timeSlotId: timeSlot.id,
                        remaining: slot.remaining,
                        currencyCode: slot.currencyCode,
                        originalPrice: 0,
                        finalPrice: 0,
                    },
                });
                await Promise.all(slot.paxAvailability.map(async (pax) => {
                    const paxType = await tx.paxType.upsert({
                        where: {
                            unique_product_pax_type: {
                                productId: product.id,
                                type: pax.type,
                            }
                        },
                        update: {},
                        create: {
                            productId: product.id,
                            type: pax.type,
                            name: pax.name,
                            description: pax.description,
                            minQuantity: pax.min,
                            maxQuantity: pax.max,
                        },
                    });
                    await tx.paxAvailability.upsert({
                        where: {
                            unique_timeSlotAvailability_paxType: {
                                timeSlotAvailabilityId: timeSlotAvailability.id,
                                paxTypeId: paxType.id,
                            }
                        },
                        update: {
                            remaining: pax.remaining,
                        },
                        create: {
                            timeSlotAvailabilityId: timeSlotAvailability.id,
                            paxTypeId: paxType.id,
                            remaining: pax.remaining,
                            originalPrice: pax.price.originalPrice,
                            finalPrice: pax.price.finalPrice,
                            currencyCode: pax.price.currencyCode,
                        },
                    });
                }));
            }));

            await tx.fetchTracker.upsert({
                where: {
                    fetchType: this.getFetchTypeForDate(date) as FetchTypes
                },
                update: {
                    lastFetched: new Date(),
                },
                create: {
                    fetchType: this.getFetchTypeForDate(date) as FetchTypes,
                    lastFetched: new Date(),
                },
            });
        });
    }

    private getFetchTypeForDate(date: string): string {
        const today = format(new Date(), 'yyyy-MM-dd');
        if (date === today) {
            return 'TODAY';
        }

        const daysDiff = Math.floor(
            (new Date(date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff <= 7) {
            return 'DAYS_7';
        }
        return 'DAYS_30';
    }

    private getDaysOfWeekForProduct(productId: number): string[] {
        if (productId === 14) {
            return ['MONDAY', 'TUESDAY', 'WEDNESDAY'];
        }
        if (productId === 15) return ['SATURDAY', 'SUNDAY'];
        return [];
    }
}
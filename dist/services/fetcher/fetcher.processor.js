"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FetcherProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetcherProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const date_fns_1 = require("date-fns");
const db_service_1 = require("../db/db.service");
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let FetcherProcessor = FetcherProcessor_1 = class FetcherProcessor extends bullmq_1.WorkerHost {
    prisma;
    redis;
    apiKey;
    baseUrl;
    logger = new common_1.Logger(FetcherProcessor_1.name);
    maxTokens = 30;
    refillRate = 30;
    refillInterval = 60000;
    key = 'rate_limiter:tokens';
    constructor(prisma) {
        super();
        this.prisma = prisma;
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
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
    }
    async initializeTokens() {
        const exists = await this.redis.exists(this.key);
        if (!exists) {
            await this.redis.set(this.key, this.maxTokens, 'PX', this.refillInterval);
        }
    }
    async acquireToken() {
        const now = Date.now();
        const lastRefill = Number(await this.redis.get(`${this.key}:lastRefill`)) || now;
        const timePassed = now - lastRefill;
        const newTokens = (timePassed * this.refillRate) / this.refillInterval;
        const currentTokens = Math.min(this.maxTokens, (Number(await this.redis.get(this.key)) || 0) + newTokens);
        await this.redis.set(this.key, currentTokens, 'PX', this.refillInterval);
        await this.redis.set(`${this.key}:lastRefill`, now);
        if (currentTokens < 1) {
            const waitTime = Math.ceil((1 - currentTokens) * this.refillInterval / this.refillRate);
            this.logger.warn(`Rate limit exceeded. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            await this.redis.set(this.key, 1, 'PX', this.refillInterval);
        }
        await this.redis.decr(this.key);
        this.logger.log(`Token acquired, ${Math.floor(currentTokens - 1)} tokens remaining`);
    }
    async process(job) {
        await this.acquireToken();
        const { productId, date } = job.data;
        console.log(`Processing job for product ${productId}, date ${date}`);
        await this.fetchAndStoreInventory(productId, date);
    }
    async fetchAndStoreInventory(productId, date) {
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
        }
        catch (error) {
            this.logger.error(`Error fetching inventory for product ${productId}, date ${date}`, error);
        }
    }
    async processInventoryData(productId, date, data) {
        await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.upsert({
                where: { id: productId },
                update: {},
                create: {
                    id: productId,
                    availableDaysOfWeek: this.getDaysOfWeekForProduct(productId),
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
                    fetchType: this.getFetchTypeForDate(date)
                },
                update: {
                    lastFetched: new Date(),
                },
                create: {
                    fetchType: this.getFetchTypeForDate(date),
                    lastFetched: new Date(),
                },
            });
        });
    }
    getFetchTypeForDate(date) {
        const today = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd');
        if (date === today) {
            return 'TODAY';
        }
        const daysDiff = Math.floor((new Date(date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) {
            return 'DAYS_7';
        }
        return 'DAYS_30';
    }
    getDaysOfWeekForProduct(productId) {
        if (productId === 14) {
            return ['MONDAY', 'TUESDAY', 'WEDNESDAY'];
        }
        if (productId === 15)
            return ['SATURDAY', 'SUNDAY'];
        return [];
    }
};
exports.FetcherProcessor = FetcherProcessor;
exports.FetcherProcessor = FetcherProcessor = FetcherProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('jobs'),
    __metadata("design:paramtypes", [db_service_1.DbService])
], FetcherProcessor);
//# sourceMappingURL=fetcher.processor.js.map
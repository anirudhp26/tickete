import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addDays, format } from 'date-fns';
import { DbService } from '../db/db.service';
import { DaysInWeek, FetchTypes } from '@prisma/client';
import { Slot } from './fetcher.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class FetcherService implements OnApplicationShutdown, OnModuleInit {
    private readonly logger = new Logger(FetcherService.name);
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly productIds = [14, 15];
    constructor(
        private readonly prisma: DbService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        if (!process.env.PARTNER_API_KEY) {
            throw new Error('PARTNER_API_KEY is required');
        }
        if (!process.env.PARTNER_API_BASE_URL) {
            throw new Error('PARTNER_API_BASE_URL is required');
        }
        this.apiKey = process.env.PARTNER_API_KEY;
        if (!process.env.PARTNER_API_BASE_URL) {
            throw new Error('PARTNER_API_BASE_URL is required');
        }
        this.baseUrl = process.env.PARTNER_API_BASE_URL;
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async fetchTodayInventory() {
        this.logger.log('Fetching inventory for today');
        const today = new Date();
        const formattedDate = format(today, 'yyyy-MM-dd');

        for (const productId of this.productIds) {
            await this.fetchAndStoreInventory(productId, formattedDate);
        }
    }

    @Cron(CronExpression.EVERY_4_HOURS)
    async fetchNext7DaysInventory() {
        this.logger.log('Fetching inventory for next 7 days');
        const today = new Date();

        for (const productId of this.productIds) {
            for (let i = 1; i <= 7; i++) {
                const date = addDays(today, i);
                const formattedDate = format(date, 'yyyy-MM-dd');
                await this.fetchAndStoreInventory(productId, formattedDate);
            }
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async fetchNext30DaysInventory() {
        this.logger.log('Fetching inventory for next 30 days');
        const today = new Date();

        for (const productId of this.productIds) {
            for (let i = 8; i <= 30; i++) {
                const date = addDays(today, i);
                const formattedDate = format(date, 'yyyy-MM-dd');
                await this.fetchAndStoreInventory(productId, formattedDate);
            }
        }
    }

    async onModuleInit() {
        this.logger.log('Fetcher service started');
    }
    
    async makeInitialFetch(productId: number): Promise<void> {
        const today = new Date();
        for (let i = 1; i <= 60; i++) {
            const date = addDays(today, i);
            const dayOfWeek = format(date, 'EEEE').toUpperCase();
            const availableDays = this.getDaysOfWeekForProduct(productId);
            if (!availableDays.includes(dayOfWeek)) {
                continue;
            }
            const formattedDate = format(date, 'yyyy-MM-dd');
            await this.fetchAndStoreInventory(productId, formattedDate);
        }
    }

    private async fetchAndStoreInventory(productId: number, date: string): Promise<void> {
        try {
            const url = `${this.baseUrl}/${productId}?date=${date}`;
            const response = await fetch(url, {
                headers: {
                    'x-api-key': `${this.apiKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch inventory for product ${productId}, date ${date}`);
            }

            const slots = await response.json() as Slot[];
            await this.processInventoryData(productId, date, slots);
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

    private getDaysOfWeekForProduct(productId: number): string[] {
        if (productId === 14) {
            return ['MONDAY', 'TUESDAY', 'WEDNESDAY'];
        }
        if (productId === 15) return ['SATURDAY', 'SUNDAY'];
        return [];
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

    async onApplicationShutdown(signal?: string) {
        this.logger.log(`Stopping fetcher service with signal: ${signal}`);
    }
}
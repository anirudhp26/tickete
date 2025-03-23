import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { addDays, format } from 'date-fns';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class FetcherService implements OnApplicationShutdown, OnModuleInit {
    private readonly logger = new Logger(FetcherService.name);
    private readonly productIds = [14, 15];
    constructor(
        private schedulerRegistry: SchedulerRegistry,
        @InjectQueue('jobs') private readonly queue: Queue,
    ) {}
    
    @Cron("0 */15 * * * *", {
        name: "inventory-sync-15m"
    })
    async fetchTodayInventory() {
        const today = new Date();
        const formattedDate = format(today, 'yyyy-MM-dd');

        for (const productId of this.productIds) {
            await this.queue.add('jobs', { productId, date: formattedDate });
        }
    }

    @Cron(CronExpression.EVERY_4_HOURS, {
        name: "inventory-sync-4h"
    })
    async fetchNext7DaysInventory() {
        const today = new Date();

        for (const productId of this.productIds) {
            for (let i = 1; i <= 7; i++) {
                const date = addDays(today, i);
                const formattedDate = format(date, 'yyyy-MM-dd');
                await this.queue.add('jobs', { productId, date: formattedDate });
            }
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_1AM, {
        name: "inventory-sync-1d"
    })
    async fetchNext30DaysInventory() {
        this.logger.log('Fetching inventory for next 30 days');
        const today = new Date();

        for (const productId of this.productIds) {
            for (let i = 8; i <= 30; i++) {
                const date = addDays(today, i);
                const formattedDate = format(date, 'yyyy-MM-dd');
                await this.queue.add('jobs', { productId, date: formattedDate });
            }
        }
    }

    async onModuleInit() {
        this.logger.log('Fetcher service started');
    }

    async stopInventorySync() {
        this.logger.log('Stopping inventory sync');
        this.schedulerRegistry.getCronJob('inventory-sync-15m').stop();
        this.schedulerRegistry.getCronJob('inventory-sync-4h').stop();
        this.schedulerRegistry.getCronJob('inventory-sync-1d').stop();
    }

    async startInventorySync() {
        this.logger.log('Starting inventory sync');
        this.schedulerRegistry.getCronJob('inventory-sync-15m').start();
        this.schedulerRegistry.getCronJob('inventory-sync-4h').start();
        this.schedulerRegistry.getCronJob('inventory-sync-1d').start();
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
            await this.queue.add('jobs', { productId, date: formattedDate });
        }
    }

    private getDaysOfWeekForProduct(productId: number): string[] {
        if (productId === 14) {
            return ['MONDAY', 'TUESDAY', 'WEDNESDAY'];
        }
        if (productId === 15) return ['SATURDAY', 'SUNDAY'];
        return [];
    }

    async onApplicationShutdown(signal?: string) {
        this.logger.log(`Stopping fetcher service with signal: ${signal}`);
    }
}
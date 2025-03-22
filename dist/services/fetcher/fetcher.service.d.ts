import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Queue } from 'bullmq';
export declare class FetcherService implements OnApplicationShutdown, OnModuleInit {
    private schedulerRegistry;
    private readonly queue;
    private readonly logger;
    private readonly productIds;
    constructor(schedulerRegistry: SchedulerRegistry, queue: Queue);
    fetchTodayInventory(): Promise<void>;
    fetchNext7DaysInventory(): Promise<void>;
    fetchNext30DaysInventory(): Promise<void>;
    onModuleInit(): Promise<void>;
    stopInventorySync(): Promise<void>;
    startInventorySync(): Promise<void>;
    makeInitialFetch(productId: number): Promise<void>;
    private getDaysOfWeekForProduct;
    onApplicationShutdown(signal?: string): Promise<void>;
}

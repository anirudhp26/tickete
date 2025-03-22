import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class DbService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
    private static instance;
    private readonly logger;
    constructor();
    onApplicationShutdown(signal?: string): Promise<void>;
    onModuleInit(): Promise<void>;
    dbCheck(): Promise<boolean>;
}

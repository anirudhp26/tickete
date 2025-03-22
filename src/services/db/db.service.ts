import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DbService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
    private static instance: DbService;
    private readonly logger = new Logger(DbService.name);

    constructor() {
        const url = process.env.DATABASE_URL;

        super({
            datasources: {
                db: { url },
            },
            log: ['error', 'warn'],
        });

        if (!DbService.instance) {
            DbService.instance = this;
        }

        return DbService.instance;
    }

    async onApplicationShutdown(signal?: string) {
        this.logger.log(`Stopping Prisma service with signal: ${signal}`)
        await this.$disconnect();
    }

    async onModuleInit() {
        await this.$connect();
    }

    async dbCheck(): Promise<boolean> {
        try {
            await this.$queryRaw`SELECT 1;`;
            return true;
        } catch (error) {
            console.error('Database query failed with ERROR: ', error);
            return false;
        }
    }
}
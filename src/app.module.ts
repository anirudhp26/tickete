import { Module } from '@nestjs/common';
import { AppController } from './controllers/app/app.controller';
import { AppService } from './services/app/app.service';
import { ExperienceController } from './controllers/experience/experience.controller';
import { ExperienceService } from './services/experience/experience.service';
import { FetcherService } from './services/fetcher/fetcher.service';
import { DbService } from './services/db/db.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv, Keyv } from '@keyv/redis';
import { CacheableMemory } from 'cacheable';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { BullModule } from '@nestjs/bullmq';
import { FetcherProcessor } from './services/fetcher/fetcher.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      }
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: seconds(60),
            limit: 30,
          },
        ],
        storage: new ThrottlerStorageRedisService(config.get('REDIS_URL')),
      }),
    }),
    CacheModule.register({
      useFactory: async () => {
        return {
          stores: [
            createKeyv(process.env.REDIS_URL),
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
          ],
        };
      },
      isGlobal: true,
    }),
    BullModule.registerQueue({
      name: "jobs"
    }),
    ScheduleModule.forRoot(),
    HttpModule
  ],
  controllers: [AppController, ExperienceController],
  providers: [AppService, ExperienceService, FetcherService, DbService, FetcherProcessor],
})

export class AppModule {}

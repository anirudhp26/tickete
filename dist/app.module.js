"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./controllers/app/app.controller");
const app_service_1 = require("./services/app/app.service");
const experience_controller_1 = require("./controllers/experience/experience.controller");
const experience_service_1 = require("./services/experience/experience.service");
const fetcher_service_1 = require("./services/fetcher/fetcher.service");
const db_service_1 = require("./services/db/db.service");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const schedule_1 = require("@nestjs/schedule");
const cache_manager_1 = require("@nestjs/cache-manager");
const redis_1 = require("@keyv/redis");
const cacheable_1 = require("cacheable");
const throttler_1 = require("@nestjs/throttler");
const throttler_storage_redis_1 = require("@nest-lab/throttler-storage-redis");
const bullmq_1 = require("@nestjs/bullmq");
const fetcher_processor_1 = require("./services/fetcher/fetcher.processor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                envFilePath: '.env',
                isGlobal: true,
            }),
            bullmq_1.BullModule.forRoot({
                connection: {
                    url: process.env.REDIS_URL,
                }
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    throttlers: [
                        {
                            ttl: (0, throttler_1.seconds)(60),
                            limit: 30,
                        },
                    ],
                    storage: new throttler_storage_redis_1.ThrottlerStorageRedisService(config.get('REDIS_URL')),
                }),
            }),
            cache_manager_1.CacheModule.register({
                useFactory: async () => {
                    return {
                        stores: [
                            (0, redis_1.createKeyv)(process.env.REDIS_URL),
                            new redis_1.Keyv({
                                store: new cacheable_1.CacheableMemory({ ttl: 60000, lruSize: 5000 }),
                            }),
                        ],
                    };
                },
                isGlobal: true,
            }),
            bullmq_1.BullModule.registerQueue({
                name: "jobs"
            }),
            schedule_1.ScheduleModule.forRoot(),
            axios_1.HttpModule
        ],
        controllers: [app_controller_1.AppController, experience_controller_1.ExperienceController],
        providers: [app_service_1.AppService, experience_service_1.ExperienceService, fetcher_service_1.FetcherService, db_service_1.DbService, fetcher_processor_1.FetcherProcessor],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
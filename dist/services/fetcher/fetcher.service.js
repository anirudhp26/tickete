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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FetcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetcherService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const date_fns_1 = require("date-fns");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let FetcherService = FetcherService_1 = class FetcherService {
    schedulerRegistry;
    queue;
    logger = new common_1.Logger(FetcherService_1.name);
    productIds = [14, 15];
    constructor(schedulerRegistry, queue) {
        this.schedulerRegistry = schedulerRegistry;
        this.queue = queue;
    }
    async fetchTodayInventory() {
        const today = new Date();
        const formattedDate = (0, date_fns_1.format)(today, 'yyyy-MM-dd');
        for (const productId of this.productIds) {
            await this.queue.add('jobs', { productId, date: formattedDate });
        }
    }
    async fetchNext7DaysInventory() {
        const today = new Date();
        for (const productId of this.productIds) {
            for (let i = 1; i <= 7; i++) {
                const date = (0, date_fns_1.addDays)(today, i);
                const formattedDate = (0, date_fns_1.format)(date, 'yyyy-MM-dd');
                await this.queue.add('jobs', { productId, date: formattedDate });
            }
        }
    }
    async fetchNext30DaysInventory() {
        this.logger.log('Fetching inventory for next 30 days');
        const today = new Date();
        for (const productId of this.productIds) {
            for (let i = 8; i <= 30; i++) {
                const date = (0, date_fns_1.addDays)(today, i);
                const formattedDate = (0, date_fns_1.format)(date, 'yyyy-MM-dd');
                await this.queue.add('jobs', { productId, date: formattedDate });
            }
        }
    }
    async onModuleInit() {
        this.logger.log('Fetcher service started');
    }
    async stopInventorySync() {
        this.logger.log('Stopping inventory sync');
        this.schedulerRegistry.getCronJob('inventory-sync-5s').stop();
        this.schedulerRegistry.getCronJob('inventory-sync-15m').stop();
        this.schedulerRegistry.getCronJob('inventory-sync-4h').stop();
        this.schedulerRegistry.getCronJob('inventory-sync-1d').stop();
    }
    async startInventorySync() {
        this.logger.log('Starting inventory sync');
        this.schedulerRegistry.getCronJob('inventory-sync-5s').start();
        this.schedulerRegistry.getCronJob('inventory-sync-15m').start();
        this.schedulerRegistry.getCronJob('inventory-sync-4h').start();
        this.schedulerRegistry.getCronJob('inventory-sync-1d').start();
    }
    async makeInitialFetch(productId) {
        const today = new Date();
        for (let i = 1; i <= 60; i++) {
            const date = (0, date_fns_1.addDays)(today, i);
            const dayOfWeek = (0, date_fns_1.format)(date, 'EEEE').toUpperCase();
            const availableDays = this.getDaysOfWeekForProduct(productId);
            if (!availableDays.includes(dayOfWeek)) {
                continue;
            }
            const formattedDate = (0, date_fns_1.format)(date, 'yyyy-MM-dd');
            await this.queue.add('jobs', { productId, date: formattedDate });
        }
    }
    getDaysOfWeekForProduct(productId) {
        if (productId === 14) {
            return ['MONDAY', 'TUESDAY', 'WEDNESDAY'];
        }
        if (productId === 15)
            return ['SATURDAY', 'SUNDAY'];
        return [];
    }
    async onApplicationShutdown(signal) {
        this.logger.log(`Stopping fetcher service with signal: ${signal}`);
    }
};
exports.FetcherService = FetcherService;
__decorate([
    (0, schedule_1.Cron)("0 */15 * * * *", {
        name: "inventory-sync-15m"
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FetcherService.prototype, "fetchTodayInventory", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_4_HOURS, {
        name: "inventory-sync-4h"
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FetcherService.prototype, "fetchNext7DaysInventory", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM, {
        name: "inventory-sync-1d"
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FetcherService.prototype, "fetchNext30DaysInventory", null);
exports.FetcherService = FetcherService = FetcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('jobs')),
    __metadata("design:paramtypes", [schedule_1.SchedulerRegistry,
        bullmq_2.Queue])
], FetcherService);
//# sourceMappingURL=fetcher.service.js.map
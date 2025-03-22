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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceService = void 0;
const common_1 = require("@nestjs/common");
const db_service_1 = require("../db/db.service");
const fetcher_service_1 = require("../fetcher/fetcher.service");
let ExperienceService = class ExperienceService {
    dbService;
    fetcher;
    constructor(dbService, fetcher) {
        this.dbService = dbService;
        this.fetcher = fetcher;
    }
    async getSlotsForProductWithDate(id, date) {
        const slots = await this.dbService.timeSlot.findMany({
            where: {
                productId: parseInt(id),
                availabilities: {
                    some: {
                        availableDate: {
                            date: new Date(date)
                        }
                    }
                }
            },
            include: {
                availabilities: {
                    where: {
                        availableDate: {
                            date: new Date(date)
                        }
                    },
                    include: {
                        paxAvailabilities: {
                            include: {
                                paxType: true
                            }
                        },
                        availableDate: true,
                    }
                },
                product: true
            }
        });
        const slotsFormatted = slots.map((slot) => {
            return {
                startTime: slot.startTime,
                startDate: slot.availabilities[0].availableDate.date.toISOString().split('T')[0],
                price: {
                    finalPrice: slot.availabilities[0].finalPrice,
                    currencyCode: slot.availabilities[0].currencyCode,
                    originalPrice: slot.availabilities[0].originalPrice
                },
                slotId: slot.id,
                remaining: slot.availabilities[0].paxAvailabilities.reduce((acc, paxAvailability) => acc + paxAvailability.remaining, 0),
                paxAvailability: slot.availabilities[0].paxAvailabilities.map((paxAvailability) => {
                    return {
                        type: paxAvailability.paxType.type,
                        name: paxAvailability.paxType.name,
                        description: paxAvailability.paxType.description,
                        price: {
                            finalPrice: paxAvailability.finalPrice,
                            currencyCode: paxAvailability.currencyCode,
                            originalPrice: paxAvailability.originalPrice
                        },
                        min: paxAvailability.paxType.minQuantity,
                        max: paxAvailability.paxType.maxQuantity,
                        remaining: paxAvailability.remaining
                    };
                })
            };
        });
        return slotsFormatted;
    }
    async getDatesForProduct(id) {
        const res = await this.dbService.availableDate.findMany({
            where: {
                productId: parseInt(id),
                date: {
                    gte: new Date()
                },
            }
        });
        const formattedDates = res.map((date) => {
            return {
                date: date.date.toISOString().split('T')[0],
                price: {
                    finalPrice: date.finalPrice,
                    currencyCode: date.currencyCode,
                    originalPrice: date.originalPrice
                }
            };
        });
        return {
            dates: formattedDates
        };
    }
    async stopInventorySync() {
        return this.fetcher.stopInventorySync();
    }
    async startInventorySync() {
        return this.fetcher.startInventorySync();
    }
    async sync() {
        this.fetcher.makeInitialFetch(15);
        return;
    }
};
exports.ExperienceService = ExperienceService;
exports.ExperienceService = ExperienceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService, fetcher_service_1.FetcherService])
], ExperienceService);
//# sourceMappingURL=experience.service.js.map
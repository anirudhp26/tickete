import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Slots } from './experience.interface';

@Injectable()
export class ExperienceService {
    constructor(private readonly dbService: DbService) {}
    async getSlotsForProductWithDate(id: string, date: string): Promise<Slots> {
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

        const slotsFormatted: Slots = slots.map((slot) => {
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
                    }
                })
            }
        }) 

        return slotsFormatted;
    }
}

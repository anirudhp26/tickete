import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ExperienceService } from '../../services/experience/experience.service';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('api/v1/experience')
@UseInterceptors(CacheInterceptor)
export class ExperienceController {
    constructor(private experienceService: ExperienceService) {}

    @Get(':id/dates')
    getDates(@Param('id') id: string) {
        const res = this.experienceService.getDatesForProduct(id);
        return res;
    }
    
    @Get(':id/slots')
    getSlots(@Param('id') id: string, @Query('date') date: string) {
        const res = this.experienceService.getSlotsForProductWithDate(id, date);
        return res;
    }

    @Get('stopsync')
    stopSync() {
        this.experienceService.stopInventorySync();
        return 'Sync stopped';
    }

    @Get('startsync')
    startSync() {
        this.experienceService.startInventorySync();
        return 'Sync started';
    }

    @Get('sync')
    syncStatus() {
        return this.experienceService.sync();
    }
}

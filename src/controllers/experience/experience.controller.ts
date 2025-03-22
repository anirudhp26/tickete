import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ExperienceService } from '../../services/experience/experience.service';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { FetcherService } from 'src/services/fetcher/fetcher.service';

@Controller('api/v1/experience')
@UseInterceptors(CacheInterceptor)
export class ExperienceController {
    constructor(private experienceService: ExperienceService, private readonly fetcher: FetcherService) {}

    @Get(':id/dates')
    getDates(@Param('id') id: string) {
        const res = this.fetcher.makeInitialFetch(parseInt(id));
        return res;
    }
    
    @Get(':id/slots')
    getSlots(@Param('id') id: string, @Query('date') date: string) {
        const res = this.experienceService.getSlotsForProductWithDate(id, date);
        return res;
    }
}

import { DbService } from '../db/db.service';
import { DateInventory, Slots } from './experience.interface';
import { FetcherService } from '../fetcher/fetcher.service';
export declare class ExperienceService {
    private readonly dbService;
    private readonly fetcher;
    constructor(dbService: DbService, fetcher: FetcherService);
    getSlotsForProductWithDate(id: string, date: string): Promise<Slots>;
    getDatesForProduct(id: string): Promise<DateInventory>;
    stopInventorySync(): Promise<void>;
    startInventorySync(): Promise<void>;
    sync(): Promise<void>;
}

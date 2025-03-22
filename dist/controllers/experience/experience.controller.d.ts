import { ExperienceService } from '../../services/experience/experience.service';
export declare class ExperienceController {
    private experienceService;
    constructor(experienceService: ExperienceService);
    getDates(id: string): Promise<import("../../services/experience/experience.interface").DateInventory>;
    getSlots(id: string, date: string): Promise<import("../../services/experience/experience.interface").Slots>;
    stopSync(): string;
    startSync(): string;
    syncStatus(): Promise<void>;
}

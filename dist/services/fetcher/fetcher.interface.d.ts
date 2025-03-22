export interface Slot {
    startDate: string;
    startTime: string;
    endTime: string;
    providerSlotId: string;
    remaining: number;
    currencyCode: string;
    variantId: number;
    paxAvailability: PaxAvailability[];
}
export interface PaxAvailability {
    max: number;
    min: number;
    remaining: number;
    type: string;
    isPrimary: boolean;
    description: string;
    name: string;
    price: Price;
}
export interface Price {
    discount: number;
    finalPrice: number;
    originalPrice: number;
    currencyCode: string;
}

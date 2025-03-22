export interface Slots extends Array<Slot> {
}
export interface PaxAvailability {
    type: string;
    name: string | null;
    description: string | null;
    price: Price;
    min: number | null;
    max: number | null;
    remaining: number;
}
export interface Price {
    finalPrice: number;
    currencyCode: string;
    originalPrice: number;
}
export interface Slot {
    startTime: string;
    startDate: string;
    price: Price;
    remaining: number;
    paxAvailability: Array<PaxAvailability>;
}
export interface DateAvailability {
    date: string;
    price: Price;
}
export interface DateInventory {
    dates: Array<DateAvailability>;
}

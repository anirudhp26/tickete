export interface Experience {
    id: string;
    name: string;
    description: string;
    dates: Date[];
    slots: Slot[];
}

export interface Date {
    date: string;
    slots: Slot[];
}

export interface Slot {
    time: string;
    booked: boolean;
    user?: string;
}
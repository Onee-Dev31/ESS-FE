import { Requester } from './core.interface';

export interface TaxiItem {
    date: string;
    description: string;
    destination: string;
    distance: number;
    amount: number;
    shiftCode?: string;
    attachedFile?: string | null;
}

export interface TaxiLogItem extends TaxiItem {
    selected: boolean;
    checkIn?: string;
    checkOut?: string;
    dayType?: string;
}

export interface TaxiRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: TaxiItem[];
    requester?: Requester;
}

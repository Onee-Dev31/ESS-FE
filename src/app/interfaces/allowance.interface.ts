import { Requester } from './core.interface';

export interface AllowanceItem {
    date: string;
    dayType?: string;
    timeIn: string;
    timeOut: string;
    description: string;
    hours: number;
    amount: number;
    selected: boolean;
    shiftCode?: string;
}

export interface AllowanceRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: AllowanceItem[];
    requester?: Requester;
}

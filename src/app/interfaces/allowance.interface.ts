import { Requester } from './vehicle.interface';

// รายการเบี้ยเลี้ยง
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

// ข้อมูลคำขอเบี้ยเลี้ยง
export interface AllowanceRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: AllowanceItem[];
    requester?: Requester;
}

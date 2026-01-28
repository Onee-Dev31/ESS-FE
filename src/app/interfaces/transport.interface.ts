import { Requester } from './vehicle.interface';

// รายการค่าเดินทาง (ยานพาหนะ)
export interface RequestItem {
    date: string;
    description: string;
    amount: number;
    shiftCode?: string;
}

// ข้อมูลคำขอค่าเดินทาง (ยานพาหนะ)
export interface VehicleRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: RequestItem[];
    requester?: Requester;
}

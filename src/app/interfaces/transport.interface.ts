import { Requester } from './vehicle.interface';

export interface RequestItem {
    date: string;
    description: string;
    amount: number;
    shiftCode?: string;
}

export interface VehicleRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: RequestItem[];
    requester?: Requester;
}

/**
 * @file Taxi Interface
 * @description Logic for Taxi Interface
 */

// Section: Imports
import { Requester } from './core.interface';

// Section: Logic
export interface TaxiItem {
    date: string;
    description: string;
    destination: string;
    distance: number;
    amount: number;
    shiftCode?: string;
    attachedFile?: string | null;
}

export interface TaxiRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: TaxiItem[];
    requester?: Requester;
}

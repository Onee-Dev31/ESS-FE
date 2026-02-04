/**
 * @file Medical Interface
 * @description Logic for Medical Interface
 */

// Section: Imports
import { Requester } from './core.interface';

// Section: Logic
export interface MedicalItem {
    id?: string;
    requestDate: string;
    limitType: string;
    diseaseType: string;
    hospital: string;
    treatmentDateFrom: string;
    treatmentDateTo: string;
    requestedAmount: number;
    approvedAmount: number;
    attachedFile?: string | null;
}

export interface MedicalRequest {
    id: string;
    createDate: string;
    status: string;
    items: MedicalItem[];
    requester?: Requester;
    employeeId?: string;
    totalRequestedAmount?: number;
    totalApprovedAmount?: number;
}

import { Requester } from './core.interface';

export interface Hospital {
    hospitalId: number;
    nameTh: string;
    nameEn: string;
    shortName: string | null;
    hospitalType: string | null;
    province: string | null;
    address: string | null;
    phone: string | null;
    isContracted: boolean;
    totalCount: number;
}

export interface HospitalSearchResponse {
    success: boolean;
    data: Hospital[];
    pagination?: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}

export interface MedicalExpenseTypeWithBalance {
    typeId: number;
    code: string;
    nameTh: string;
    nameEn: string;
    icon: string | null;
    isSubOfOpd: boolean;
    eligibleFromFirstDay: boolean;
    eligibleAfterProbation: boolean;
    sortOrder: number;
    totalLimit: number;
    usedAmount: number;
    remainingAmount: number;
}

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

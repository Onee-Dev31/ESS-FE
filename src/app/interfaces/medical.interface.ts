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

export interface BenefitPlan {
    planId: number;
    planNo: string;
    jobClassLabel: string;
    jobClassMin: number;
    jobClassMax: number;
    opdLimit: number;
    ipdLimit: number;
    dentalLimit: number;
    visionLimit: number;
    opdPerVisitCap: number;
    opdOverCap: number;
    ipdDailyCap: number;
    ipdDailyOverCap: number;
}

export interface PolicyContent {
    contentId: number;
    sectionNo: string;
    sectionTitle: string;
    content: string;
    contentType: 'section' | 'subsection' | 'item' | 'note' | 'warning';
    parentId: number | null;
    sortOrder: number;
}

export interface MedicalPolicy {
    benefit_plans: BenefitPlan[];
    policy_content: PolicyContent[];
}

export interface MedicalPolicyResponse {
    success: boolean;
    data: MedicalPolicy;
}

export interface DiseaseType {
    diseaseId: number;
    code: string;
    nameTh: string;
    nameEn: string;
    icd10Code: string | null;
    category: string | null;
    expenseTypeId: number | null;
    isExcluded: boolean;
    excludeReason: string | null;
    sortOrder: number;
    totalCount: number;
}

export interface DiseaseTypeSearchResponse {
    success: boolean;
    data: DiseaseType[];
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

import { AllowanceRequest } from './allowance.interface';
import { MedicalRequest } from './medical.interface';

/** ข้อมูลรายการย่อย (เช่น รายการย่อยในบิลรักษาพยาบาล) */
export interface UnifiedItem {
    date: string;
    description?: string;
    timeIn?: string;
    timeOut?: string;
    amount: number;
    destination?: string;
    shiftCode?: string;
    attachedFile?: string;
}

/** ข้อมูลหลักของรายการขออนุมัติ (สวัสดิการ, ค่าเดินทาง, ฯลฯ) */
export interface ApprovalItem {
    requestNo: string;
    requestDate: string;
    requestBy: {
        name: string;
        employeeId: string;
        department: string;
        company: string;
        position?: string;
        profileImage?: string;
    };
    requestType: 'ค่าเบี้ยเลี้ยง' | 'ค่ารถ' | 'ค่าแท็กซี่' | 'ค่ารักษาพยาบาล';
    typeId: number;
    requestDetail: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Referred Back';
    rawStatus: string;
    type?: 'allowance' | 'taxi' | 'transport' | 'medical';
    originalData?: AllowanceRequest | MedicalRequest | any;
}

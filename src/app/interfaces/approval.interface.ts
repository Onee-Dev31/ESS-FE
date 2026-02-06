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
    originalData?: any;
}

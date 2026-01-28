export interface TimeOffRequest {
    id: string;
    createDate: string;
    status: string;
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachments: { name: string; url?: string }[];
}

export const LEAVE_TYPES = [
    { id: 'vacation', label: 'ลาพักร้อน', icon: 'fas fa-plane-departure', color: '#ef4444' },
    { id: 'personal', label: 'ลากิจ', icon: 'fas fa-briefcase', color: '#3b82f6' },
    { id: 'sick', label: 'ลาป่วย', icon: 'fas fa-stethoscope', color: '#4049c7' },
    { id: 'sterilization', label: 'ลาทำหมัน', icon: 'fas fa-user-md', color: '#9333ea' },
    { id: 'funeral', label: 'ลาเพื่อจัดการงานศพ', icon: 'fas fa-ribbon', color: '#35b653' },
];

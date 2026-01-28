import { TimeOffRequest, LEAVE_TYPES } from '../interfaces/time-off.interface';

export class TimeOffMock {
    static generateRequests(count: number): TimeOffRequest[] {
        return Array.from({ length: count }, (_, i) => ({
            id: `L2701#${String(i + 1).padStart(3, '0')}`,
            createDate: new Date().toISOString(),
            status: i % 3 === 0 ? 'อนุมัติแล้ว' : 'คำขอใหม่',
            employeeId: 'EMP001',
            leaveType: LEAVE_TYPES[i % LEAVE_TYPES.length].label,
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            reason: 'ไปทำธุระส่วนตัว',
            attachments: []
        }));
    }
}

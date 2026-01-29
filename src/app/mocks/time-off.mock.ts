import { TimeOffRequest, LEAVE_TYPES } from '../interfaces/time-off.interface';
import dayjs from 'dayjs';

export class TimeOffMock {
    static generateRequests(count: number): TimeOffRequest[] {
        return Array.from({ length: count }, (_, i) => {
            const today = dayjs();
            const startDate = today.add(i, 'day');

            const leaveType = LEAVE_TYPES[i % LEAVE_TYPES.length];

            // Determine days and period based on leave type
            let daysCount: number;
            let leavePeriod: string;

            // Vacation and funeral leave = full days only (1, 2, 3)
            if (leaveType.label === 'ลาพักร้อน' || leaveType.label === 'ลาเพื่อจัดการงานศพ') {
                const fullDays = [1, 2, 3];
                daysCount = fullDays[i % fullDays.length];
                leavePeriod = 'full-day';
            } else {
                // Sick, Personal, Sterilization can have half days
                const periods = ['full-day', 'morning', 'full-day', 'afternoon'];
                leavePeriod = periods[i % periods.length];

                // Set days based on period
                if (leavePeriod === 'morning' || leavePeriod === 'afternoon') {
                    daysCount = 0.5;
                } else {
                    const fullDays = [1, 2, 1];
                    daysCount = fullDays[i % fullDays.length];
                }
            }

            // Calculate end date based on number of days
            let endDate = startDate;
            if (daysCount > 0.5) {
                endDate = startDate.add(Math.floor(daysCount) - 1, 'day');
            }

            // Rotate through all 4 statuses
            const statuses = ['คำขอใหม่', 'ตรวจสอบแล้ว', 'อยู่ระหว่างการอนุมัติ', 'อนุมัติแล้ว'];

            return {
                id: `L2701#${String(i + 1).padStart(3, '0')}`,
                createDate: today.toISOString(),
                status: statuses[i % statuses.length],
                employeeId: 'EMP001',
                leaveType: leaveType.label,
                startDate: startDate.format('YYYY-MM-DD'),
                endDate: endDate.format('YYYY-MM-DD'),
                reason: 'ไปทำธุระส่วนตัว',
                attachments: this.generateAttachments(i),
                days: daysCount,
                leavePeriod: leavePeriod,
                shiftStartTime: '08:00',
                shiftEndTime: '17:00'
            };
        });
    }

    private static generateAttachments(index: number): { name: string; url?: string }[] {
        // All requests have 1-3 attachments
        const attachmentCount = (index % 3) + 1; // 1, 2, or 3 files

        const fileNames = [
            'ใบรับรองแพทย์.pdf',
            'เอกสารแนบ.pdf',
            'หนังสือรับรอง.pdf',
            'ใบลา.pdf',
            'สำเนาบัตรประชาชน.pdf'
        ];

        return Array.from({ length: attachmentCount }, (_, i) => ({
            name: fileNames[i % fileNames.length],
            url: `https://example.com/files/${index}-${i}.pdf`
        }));
    }
}

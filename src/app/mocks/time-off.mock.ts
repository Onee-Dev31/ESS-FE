import { TimeOffRequest, LEAVE_TYPES } from '../interfaces/time-off.interface';
import { MockHelper } from './mock-helper';
import dayjs from 'dayjs';

export class TimeOffMock {
  static generateRequestsByRole(count: number, role: 'Admin' | 'Member'): TimeOffRequest[] {
    return Array.from({ length: count }, (_, i) => {
      const today = dayjs();
      const startDate = today.add(i, 'day');

      const leaveType = LEAVE_TYPES[i % LEAVE_TYPES.length];

      let daysCount: number;
      let leavePeriod: string;

      if (leaveType.label === 'ลาพักร้อน' || leaveType.label === 'ลาเพื่อจัดการงานศพ') {
        const fullDays = [1, 2, 3];
        daysCount = fullDays[i % fullDays.length];
        leavePeriod = 'full-day';
      } else {
        const periods = ['full-day', 'morning', 'full-day', 'afternoon'];
        leavePeriod = periods[i % periods.length];

        if (leavePeriod === 'morning' || leavePeriod === 'afternoon') {
          daysCount = 0.5;
        } else {
          const fullDays = [1, 2, 1];
          daysCount = fullDays[i % fullDays.length];
        }
      }

      let endDate = startDate;
      if (daysCount > 0.5) {
        endDate = startDate.add(Math.floor(daysCount) - 1, 'day');
      }

      let statuses = ['NEW', 'WAITING_CHECK', 'PENDING_APPROVAL', 'APPROVED'];
      let requester = MockHelper.getRequesterByRole(role);
      let status = statuses[i % statuses.length];

      if (role === 'Admin') {
        requester = MockHelper.getRandomRequester();
        const conditions = ['NEW', 'WAITING_CHECK', 'PENDING_APPROVAL', 'APPROVED'];
        status = conditions[Math.floor(Math.random() * conditions.length)];
      }

      return {
        id: `TO-${String(i + 1).padStart(3, '0')}`,
        createDate: today.toISOString(),
        status: status,
        employeeId: role === 'Admin' ? 'OTD00001' : 'OTD01054',
        requester: requester,
        leaveType: leaveType.label,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        reason: 'ไปทำธุระส่วนตัว',
        attachments: this.generateAttachments(i),
        days: daysCount,
        leavePeriod: leavePeriod,
        shiftStartTime: '08:00',
        shiftEndTime: '17:00',
      };
    });
  }

  static generateRequests(count: number): TimeOffRequest[] {
    return this.generateRequestsByRole(count, 'Member');
  }

  private static generateAttachments(index: number): { name: string; url?: string }[] {
    const attachmentCount = (index % 3) + 1;

    const fileNames = [
      'ใบรับรองแพทย์.pdf',
      'เอกสารแนบ.pdf',
      'หนังสือรับรอง.pdf',
      'ใบลา.pdf',
      'สำเนาบัตรประชาชน.pdf',
    ];

    return Array.from({ length: attachmentCount }, (_, i) => ({
      name: fileNames[i % fileNames.length],
      url: `https://example.com/files/${index}-${i}.pdf`,
    }));
  }
}

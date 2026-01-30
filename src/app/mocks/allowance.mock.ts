import { AllowanceRequest } from '../interfaces/allowance.interface';
import { WELFARE_TYPES } from '../constants/welfare-types.constant';
import { MockHelper } from './mock-helper';

export class AllowanceMock {
    static generateRequestsByRole(count: number, role: 'Admin' | 'Member'): AllowanceRequest[] {
        return Array.from({ length: count }, (_, i) => {
            const dateStr = MockHelper.getRandomDateInPast3Months();
            let requester = MockHelper.getRequesterByRole(role);
            let status = MockHelper.getRandomStatus('allowance');

            // Logic for Admin: See others' requests that need approval
            if (role === 'Admin') {
                requester = MockHelper.getRandomRequester(); // Random employees
                // Bias towards actionable statuses for Admin
                const conditions = ['WAITING_CHECK', 'VERIFIED', 'PENDING_APPROVAL', 'APPROVED'];
                status = conditions[Math.floor(Math.random() * conditions.length)];
            }
            // Logic for Member: See own requests (already set by getRequesterByRole)

            return {
                id: `2701#${String(i + 1).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.ALLOWANCE,
                createDate: dateStr,
                status: status,
                requester: requester,
                items: [
                    { date: '2026-01-10', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค A', hours: 3, amount: 150, selected: true, shiftCode: 'O01 09.00-21.00' },
                    { date: '2026-01-11', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค B', hours: 3, amount: 150, selected: true, shiftCode: 'O01 09.00-21.00' }
                ]
            };
        });
    }

    static generateRequests(count: number): AllowanceRequest[] {
        return this.generateRequestsByRole(count, 'Member');
    }

    static getMockAllowanceLogs(month: number, year: number): any[] {
        const days = MockHelper.generateDays(month, year);
        return days.map((date: Date) => {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayType = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let description = '';

            if (dayType === 'W') {
                const startHour = 8 + Math.floor(Math.random() * 2);
                const startMinute = Math.floor(Math.random() * 60);
                const endHour = 17 + Math.floor(Math.random() * 4);
                const endMinute = Math.floor(Math.random() * 60);

                timeIn = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
                timeOut = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

                if (Math.random() > 0.7) description = 'ทำงานล่วงเวลา (OT)';
            }

            return {
                date: MockHelper.formatDate(date),
                dayType: dayType,
                timeIn: timeIn,
                timeOut: timeOut,
                selected: false,
                description: description,
                shiftCode: MockHelper.getRandomShiftCode()
            };
        });
    }
}

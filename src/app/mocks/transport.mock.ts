/**
 * @file Transport Mock
 * @description Logic for Transport Mock
 */

// Section: Imports
import { VehicleRequest, AttendanceLog } from '../interfaces/transport.interface';
import { WELFARE_TYPES } from '../constants/welfare-types.constant';
import { MockHelper } from './mock-helper';

// Section: Logic
export class TransportMock {
    static generateRequestsByRole(count: number, role: 'Admin' | 'Member'): VehicleRequest[] {
        return Array.from({ length: count }, (_, i) => {
            const dateStr = MockHelper.getRandomDateInPast3Months();
            let requester = MockHelper.getRequesterByRole(role);
            let status = MockHelper.getRandomStatus('vehicle');

            if (role === 'Admin') {
                requester = MockHelper.getRandomRequester();
                const conditions = ['NEW', 'WAITING_CHECK', 'PENDING_APPROVAL', 'APPROVED'];
                status = conditions[Math.floor(Math.random() * conditions.length)];
            }

            return {
                id: `2701#${String(i + 1).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TRANSPORT,
                createDate: dateStr,
                status: status,
                requester: requester,
                items: [
                    { date: '2026-01-15', description: 'เดินทางไปพบลูกค้า', amount: 500, shiftCode: 'O01 09.00-18.00' }
                ]
            };
        });
    }

    static generateRequests(count: number): VehicleRequest[] {
        return this.generateRequestsByRole(count, 'Member');
    }

    static getMockAttendanceLogs(month: number, year: number): AttendanceLog[] {
        const days = MockHelper.generateDays(month, year);
        return days.map(date => {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayType = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let description = '';

            if (dayType === 'W') {
                const scenario = Math.random();
                if (scenario > 0.9) {
                    timeIn = '09:00';
                    timeOut = '23:30';
                    description = 'มาเช้า-กลับดึก';
                } else if (scenario > 0.8) {
                    timeIn = '05:30';
                    timeOut = '18:00';
                    description = 'มาทำงานเช้ามืด';
                } else {
                    const inHour = 8 + Math.floor(Math.random() * 2);
                    const inMin = Math.floor(Math.random() * 60);
                    const outHour = 17 + Math.floor(Math.random() * 2);
                    const outMin = Math.floor(Math.random() * 60);
                    timeIn = `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`;
                    timeOut = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`;
                }
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

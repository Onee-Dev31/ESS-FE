import { TaxiRequest } from '../interfaces/taxi.interface';
import { WELFARE_TYPES } from '../constants/welfare-types.constant';
import { MockHelper } from './mock-helper';

export class TaxiMock {
    static generateRequestsByRole(count: number, role: 'Admin' | 'Member'): TaxiRequest[] {
        return Array.from({ length: count }, (_, i) => {
            const dateStr = MockHelper.getRandomDateInPast3Months();
            const items = [
                { date: dateStr, description: 'เดินทางไปพบลูกค้ากนกวัฒนา', destination: 'GMM Grammy', distance: 12.5, amount: 250, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_01.jpg' },
                { date: dateStr, description: 'เดินทางกลับสำนักงานจากพบลูกค้า', destination: 'Office', distance: 12.5, amount: 230, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_02.jpg' }
            ];

            let requester = MockHelper.getRequesterByRole(role);
            let status = MockHelper.getRandomStatus('taxi');

            if (role === 'Admin') {
                requester = MockHelper.getRandomRequester();
                const conditions = ['WAITING_CHECK', 'VERIFIED', 'PENDING_APPROVAL', 'APPROVED'];
                status = conditions[Math.floor(Math.random() * conditions.length)];
            }

            return {
                id: `2701#${String(i + 1).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TAXI,
                createDate: dateStr,
                status: status,
                requester: requester,
                items: items
            };
        });
    }

    static generateRequests(count: number): TaxiRequest[] {
        return this.generateRequestsByRole(count, 'Member');
    }

    static getMockTaxiLogs(month: number, year: number): any[] {
        const days = MockHelper.generateDays(month, year);
        return days.map((date: Date) => {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayType = isWeekend ? 'H' : 'W';

            let checkIn = '';
            let checkOut = '';

            if (dayType === 'W') {
                checkIn = `09:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
                checkOut = `18:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
            }

            return {
                date: MockHelper.formatDate(date),
                dayType: dayType,
                checkIn: checkIn,
                checkOut: checkOut,
                description: '',
                destination: '',
                distance: 0,
                amount: 0,
                selected: false,
                shiftCode: MockHelper.getRandomShiftCode()
            };
        });
    }
}

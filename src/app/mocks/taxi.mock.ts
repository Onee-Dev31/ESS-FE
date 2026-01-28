import { TaxiRequest } from '../interfaces/taxi.interface';
import { WELFARE_TYPES } from '../constants/welfare-types.constant';
import { MockHelper } from './mock-helper';

export class TaxiMock {
    static generateRequests(count: number): TaxiRequest[] {
        return Array.from({ length: count }, (_, i) => {
            const dateStr = MockHelper.getRandomDateInPast3Months();
            const items = [
                { date: dateStr, description: 'เดินทางไปพบลูกค้ากนกวัฒนา', destination: 'GMM Grammy', distance: 12.5, amount: 250, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_01.jpg' },
                { date: dateStr, description: 'เดินทางกลับสำนักงานจากพบลูกค้า', destination: 'Office', distance: 12.5, amount: 230, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_02.jpg' }
            ];

            return {
                id: `2701#${String(i + 1).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TAXI,
                createDate: dateStr,
                status: MockHelper.getRandomStatus('taxi'),
                requester: MockHelper.getRandomRequester(),
                items: items
            };
        });
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

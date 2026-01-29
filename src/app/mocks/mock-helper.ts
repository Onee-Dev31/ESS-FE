import { Requester } from '../interfaces/vehicle.interface';
import { REQUEST_STATUS_LIST } from '../constants/request-status.constant';
import dayjs from 'dayjs';

export class MockHelper {
    static getRandomStatus(type: 'allowance' | 'taxi' | 'vehicle'): string {
        return REQUEST_STATUS_LIST[Math.floor(Math.random() * REQUEST_STATUS_LIST.length)];
    }

    static getRandomDateInPast3Months(): string {
        return dayjs().subtract(Math.floor(Math.random() * 90), 'day').format('YYYY-MM-DD');
    }

    static getRandomRequester(): Requester {
        const users = [
            { name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)', id: 'OTD01054', dept: '10806-IT Department' },
            { name: 'แพรวนภา บุตรโคษา (แพรว)', id: 'OTD01055', dept: '10801-HR Department' },
            { name: 'สมชาย รักดี', id: 'OTD01056', dept: '10802-Sales Department' },
            { name: 'วิภาวี สวยงาม', id: 'OTD01057', dept: '10803-Marketing' },
            { name: 'กิตติศักดิ์ มั่นคง', id: 'OTD01058', dept: '10804-Operations' }
        ];
        const user = users[Math.floor(Math.random() * users.length)];
        return {
            name: user.name,
            employeeId: user.id,
            department: user.dept,
            company: 'บริษัท OTD'
        };
    }

    static generateDays(monthInput: number | string, yearInput: number | string): Date[] {
        const month = Number(monthInput);
        const year = Number(yearInput);
        // year input is in BE, so convert to CE
        const yearCE = year - 543;
        const startDate = dayjs().year(yearCE).month(month).date(1);
        const days: Date[] = [];
        let curr = startDate;
        while (curr.month() === month) {
            days.push(curr.toDate());
            curr = curr.add(1, 'day');
        }
        return days;
    }

    static formatDate(d: Date): string {
        return dayjs(d).format('DD/MM/YYYY');
    }

    static getRandomShiftCode(): string {
        const shifts = [
            'O01 09.00-18.00', 'O02 10.00-19.00', 'O03 10.00-22.00', 'O04 09.00-23.00', 'O19 19.00-07.00',
            'O01 09.00-18.01', 'O02 10.00-19.01', 'O03 10.00-22.01', 'O04 09.00-23.01', 'O19 19.00-07.02'
        ];
        return shifts[Math.floor(Math.random() * shifts.length)];
    }
}

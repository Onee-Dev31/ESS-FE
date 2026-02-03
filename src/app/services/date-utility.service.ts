import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import relativeTime from 'dayjs/plugin/relativeTime';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(relativeTime);
dayjs.extend(buddhistEra);
dayjs.locale('th');

@Injectable({
    providedIn: 'root'
})

export class DateUtilityService {

    formatDateToThaiMonth(dateStr: string | Date): string {
        return dayjs(dateStr).format('DD-MMM-YYYY');
    }

    formatDateToBE(isoDate: string): string {
        if (!isoDate) return '';
        return dayjs(isoDate).format('DD/MM/BBBB');
    }

    formatBEToISO(beDate: string): string {
        if (!beDate) return '';
        const parts = beDate.split('/');
        if (parts.length !== 3) return beDate;

        const yearCE = parseInt(parts[2]) - 543;
        return `${yearCE}-${parts[1]}-${parts[0]}`;
    }

    getCurrentDateISO(): string {
        return dayjs().format('YYYY-MM-DD');
    }

    isValidDateRange(startDate: string, endDate: string): boolean {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        return start.isBefore(end) || start.isSame(end);
    }

    getTimeAgo(date: string | Date): string {
        return dayjs(date).fromNow();
    }

    diffInDays(startDate: string | Date, endDate: string | Date): number {
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).startOf('day');
        return end.diff(start, 'day') + 1;
    }
}

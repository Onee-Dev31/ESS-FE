import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import relativeTime from 'dayjs/plugin/relativeTime';
import buddhistEra from 'dayjs/plugin/buddhistEra';

// Extend dayjs with plugins
dayjs.extend(relativeTime);
dayjs.extend(buddhistEra);
dayjs.locale('th');

@Injectable({
    providedIn: 'root'
})
export class DateUtilityService {

    /**
     * Format date to Thai month format (dd-MMM-yyyy)
     */
    formatDateToThaiMonth(dateStr: string | Date): string {
        return dayjs(dateStr).format('DD-MMM-YYYY');
    }

    /**
     * Convert ISO date to Buddhist Era format (dd/mm/yyyy+543)
     */
    formatDateToBE(isoDate: string): string {
        if (!isoDate) return '';
        return dayjs(isoDate).format('DD/MM/BBBB'); // BBBB is Day.js Buddhist Era year
    }

    /**
     * Convert Buddhist Era date to ISO format (yyyy-mm-dd)
     */
    formatBEToISO(beDate: string): string {
        if (!beDate) return '';
        const parts = beDate.split('/');
        if (parts.length !== 3) return beDate;

        // Buddhist Era to Gregorian (CE)
        const yearCE = parseInt(parts[2]) - 543;
        return `${yearCE}-${parts[1]}-${parts[0]}`;
    }

    /**
     * Get current date in ISO format
     */
    getCurrentDateISO(): string {
        return dayjs().format('YYYY-MM-DD');
    }

    /**
     * Validate date range
     */
    isValidDateRange(startDate: string, endDate: string): boolean {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        return start.isBefore(end) || start.isSame(end);
    }

    /**
     * Get human-readable time difference (e.g., "2 วันที่แล้ว")
     */
    getTimeAgo(date: string | Date): string {
        return dayjs(date).fromNow();
    }

    /**
     * Calculate difference in days
     */
    diffInDays(startDate: string | Date, endDate: string | Date): number {
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).startOf('day');
        return end.diff(start, 'day') + 1;
    }
}

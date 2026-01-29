import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DateUtilityService {
    private readonly MONTHS = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
        'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
        'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    /**
     * Format date to Thai month format (dd-MonthName-yyyy)
     * @param dateStr ISO date string or Date object
     * @returns Formatted date string
     */
    formatDateToThaiMonth(dateStr: string | Date): string {
        const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = this.MONTHS[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Convert ISO date to Buddhist Era format (dd/mm/yyyy+543)
     * @param isoDate ISO date string (yyyy-mm-dd)
     * @returns Date in BE format (dd/mm/yyyy)
     */
    formatDateToBE(isoDate: string): string {
        const parts = isoDate.split('-');
        if (parts.length !== 3) return isoDate;
        const year = parseInt(parts[0]) + 543;
        return `${parts[2]}/${parts[1]}/${year}`;
    }

    /**
     * Convert Buddhist Era date to ISO format (yyyy-mm-dd)
     * @param beDate Date in BE format (dd/mm/yyyy)
     * @returns ISO date string
     */
    formatBEToISO(beDate: string): string {
        const parts = beDate.split('/');
        if (parts.length !== 3) return beDate;
        const year = parseInt(parts[2]) - 543;
        return `${year}-${parts[1]}-${parts[0]}`;
    }

    /**
     * Get current date in ISO format
     * @returns Current date (yyyy-mm-dd)
     */
    getCurrentDateISO(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Validate date range (start date must be before or equal to end date)
     * @param startDate Start date
     * @param endDate End date
     * @returns true if valid, false otherwise
     */
    isValidDateRange(startDate: string, endDate: string): boolean {
        return new Date(startDate) <= new Date(endDate);
    }
}

import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import relativeTime from 'dayjs/plugin/relativeTime';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(relativeTime);
dayjs.extend(buddhistEra);
dayjs.locale('th');

@Injectable({
  providedIn: 'root',
})

/** Service สำหรับจัดการและฟอร์แมตวันที่ (รองรับ พ.ศ. และ Dayjs) */
export class DateUtilityService {
  formatDateToThaiMonth(dateStr: string | Date): string {
    return dayjs(dateStr).format('DD-MMM-YYYY');
  }

  /** แปลงวันที่ ISO เป็นรูปแบบ พ.ศ. (DD/MM/BBBB) */
  formatDateToBE(isoDate: string, format = 'DD/MM/BBBB', local = 'en'): string {
    if (!isoDate) return '';
    return dayjs(isoDate).locale(local).format(format);
  }

  /** แปลงวันที่ พ.ศ. กลับเป็นรูปแบบ ISO (YYYY-MM-DD) สำหรับ API */
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

  /** คำนวณเวลาที่ผ่านไปเป็นภาษาไทย (เช่น "3 วันที่แล้ว") */
  getTimeAgo(date: string | Date): string {
    return dayjs(date).fromNow();
  }

  diffInDays(startDate: string | Date, endDate: string | Date): number {
    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');
    return end.diff(start, 'day') + 1;
  }

  hoursToHHMM(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

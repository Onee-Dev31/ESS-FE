import { Component, ElementRef, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TeamCalendarService } from '../../services/team-calendar.service';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { DateUtilityService } from '../../services/date-utility.service';
import { SwalService } from '../../services/swal.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import dayjs from 'dayjs';
import { AuthService } from '../../services/auth.service';
import { MasterDataService } from '../../services/master-data.service';

@Component({
  selector: 'app-setting-holiday',
  imports: [
    FormsModule,
    CommonModule,
    PageHeaderComponent,
    NzButtonModule,
    NzSelectModule,
    EmptyStateComponent,
    SkeletonComponent,
    NzDatePickerModule,
  ],
  templateUrl: './setting-holiday.html',
  styleUrl: './setting-holiday.scss',
})
export class SettingHoliday {
  pageTitle = signal<string>('กำหนดวันหยุด');

  private teamCalendarService = inject(TeamCalendarService);
  private masterService = inject(MasterDataService);
  private swalService = inject(SwalService);
  private authService = inject(AuthService);
  dateUtil = inject(DateUtilityService);

  loading = signal(false);
  years: number[] = [];
  futureYears: number[] = [];
  holidays = signal<any[]>([]);
  exportHolidayList = signal<any[]>([]);

  searchYear: number = new Date().getFullYear();
  searchHolidayName = '';
  exportYear: number = new Date().getFullYear();
  exportAnnouncementNo = `2/${new Date().getFullYear() + 543}`;
  exportAnnouncementDate: Date | null = new Date();

  isHolidayModalOpen = signal(false);
  isExportModalOpen = signal(false);
  isExporting = signal(false);
  selectedYear = new Date().getFullYear() + 1;
  holidayFormList = signal<any[]>([]);

  isEditMode = false;
  editingYear: number | null = null;
  originalHolidayList: any[] = [];

  formData = {
    year: 2026,
    holidayDate: '',
    holidayName: '',
    description: '',
  };

  mode: 'manual' | 'excel' = 'manual';
  selectedExcelFile: File | null = null;

  @ViewChild('fileInput')
  fileInput!: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.generateYears();
    this.generateFullYears();
    this.getHoliday();
  }

  generateYears(): void {
    const currentYear = new Date().getFullYear();

    const start = currentYear - 0;
    const end = currentYear + 5;

    this.years = [];

    for (let y = start; y <= end; y++) {
      this.years.push(y);
    }
  }

  generateFullYears(): void {
    const currentYear = new Date().getFullYear();

    const start = currentYear - -1;
    const end = currentYear + 5;

    this.futureYears = [];

    for (let y = start; y <= end; y++) {
      this.futureYears.push(y);
    }
  }

  getHoliday(): void {
    console.log(this.searchYear, this.searchHolidayName);
    if (!this.searchYear) {
      this.swalService.warning('กรุณาเลือกปี');
    }
    this.loading.set(true);

    this.teamCalendarService
      .getHoliday(this.searchYear?.toString(), this.searchHolidayName)
      .subscribe({
        next: (res: any) => {
          console.log(res);
          this.holidays.set(this.mapHoliday(res));

          this.loading.set(false);
        },

        error: (err) => {
          console.error('Get Holiday Error : ', err);

          this.loading.set(false);
        },
      });
  }

  private mapHoliday(res: any): any[] {
    return res.map((x: any) => ({
      id: x.ID,
      year: x.YEAR,
      day: x.Day,
      holidayDate: x.HOLIDAY_DATE ? new Date(x.HOLIDAY_DATE) : null,
      holidayName: x.HOLIDAY_NAME,
    }));
  }

  openExportHolidayModal(): void {
    this.exportYear = Number(this.searchYear || new Date().getFullYear());
    this.exportAnnouncementDate = new Date();
    this.exportAnnouncementNo = `2/${this.getBuddhistYear(this.exportAnnouncementDate)}`;
    this.exportHolidayList.set([]);
    this.isExportModalOpen.set(true);
  }

  closeExportHolidayModal(): void {
    if (this.isExporting()) return;
    this.isExportModalOpen.set(false);
    this.exportHolidayList.set([]);
  }

  private async prepareHolidayPdfData(): Promise<boolean> {
    if (!this.exportYear) {
      this.swalService.warning('กรุณาเลือกปี');
      return false;
    }

    if (!this.exportAnnouncementDate) {
      this.swalService.warning('กรุณาเลือกวันที่ประกาศ');
      return false;
    }

    try {
      const res = await firstValueFrom(
        this.teamCalendarService.getHoliday(this.exportYear.toString()),
      );
      const holidays = this.mapHoliday(res).sort(
        (a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime(),
      );

      if (!holidays.length) {
        this.swalService.warning('ไม่พบข้อมูลวันหยุดของปีที่เลือก');
        return false;
      }

      this.exportHolidayList.set(holidays);
      return true;
    } catch (err) {
      console.error('Prepare Holiday PDF Error : ', err);
      this.swalService.warning('Export PDF ไม่สำเร็จ');
      return false;
    }
  }

  async downloadHolidayPdf(): Promise<void> {
    this.isExporting.set(true);

    try {
      const isReady = await this.prepareHolidayPdfData();
      if (!isReady) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = document.getElementById('holiday-export-document');
      if (!element) {
        this.swalService.warning('ไม่พบรูปแบบเอกสารสำหรับ Export');
        return;
      }

      element.classList.add('pdf-capture-mode');
      await document.fonts?.ready;

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      pdf.save(`holiday-${this.exportYear}.pdf`);
      this.isExportModalOpen.set(false);
    } catch (err) {
      console.error('Export Holiday PDF Error : ', err);
      this.swalService.warning('Export PDF ไม่สำเร็จ');
    } finally {
      document.getElementById('holiday-export-document')?.classList.remove('pdf-capture-mode');
      this.isExporting.set(false);
    }
  }

  addHoliday(): void {
    this.isEditMode = false;

    this.selectedYear = new Date().getFullYear() + 1;

    this.holidayFormList.set([]);

    this.isHolidayModalOpen.set(true);
  }

  editHoliday(year: number) {
    console.log(year);
    this.isEditMode = true;
    this.editingYear = year;

    this.selectedYear = year;

    this.loading.set(true);

    this.teamCalendarService.getHoliday(year.toString()).subscribe({
      next: (res: any) => {
        const mapped = this.mapHoliday(res).map((x) => ({
          ...x,
          holidayDate: new Date(x.holidayDate),
        }));

        // this.holidayFormList.set(mapped);
        this.originalHolidayList = this.mapHoliday(res);
        this.holidayFormList.set(structuredClone(this.originalHolidayList));
        this.isHolidayModalOpen.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      },
    });
  }

  addHolidayRow(): void {
    const data = this.holidayFormList();
    const selectedYear = Number(this.selectedYear);

    data.push({
      id: crypto.randomUUID(),
      holidayDate: new Date(selectedYear, 0, 1), // 1 Jan ของปีที่เลือก
      holidayName: '',
    });

    this.holidayFormList.set([...data]);
  }

  removeHolidayRow(index: number): void {
    const data = this.holidayFormList();

    data.splice(index, 1);

    this.holidayFormList.set([...data]);
  }

  copyPreviousYear(): void {
    const previousYear = new Date().getFullYear();

    this.teamCalendarService.getHoliday(previousYear.toString()).subscribe({
      next: (res: any) => {
        const mapped = res.map((x: any) => {
          const oldDate = new Date(x.HOLIDAY_DATE);

          const newDate = new Date(oldDate);

          newDate.setFullYear(this.selectedYear);

          return {
            id: crypto.randomUUID(),
            holidayDate: newDate.toISOString().split('T')[0],
            holidayName: x.HOLIDAY_NAME,
          };
        });

        this.holidayFormList.set(mapped);
      },

      error: (err) => {
        console.error(err);
      },
    });
  }

  saveHoliday(): void {
    this.swalService.loading('กำลังบันทึกข้อมูล...');
    const current = this.holidayFormList();
    const original = this.originalHolidayList;

    const currentMap = new Map(current.map((x) => [x.id, x]));
    const originalMap = new Map(original.map((x) => [x.id, x]));

    const payload: {
      year: string;
      createdBy: string;
      holidays: any[];
    } = {
      year: this.selectedYear.toString(),
      createdBy: this.authService.userData().AD_USER,

      holidays: [],
    };

    // 🔵 CREATE + UPDATE
    for (const item of current) {
      if (!item.id || typeof item.id === 'string') {
        payload.holidays.push({
          action: 'create',
          holidayDate: dayjs(item.holidayDate).format('YYYY-MM-DD'),
          holidayName: item.holidayName,
          remark: '',
        });
        continue;
      }

      const old = originalMap.get(item.id);

      if (!old) continue;

      const isChanged =
        dayjs(old.holidayDate).format('YYYY-MM-DD') !==
          dayjs(item.holidayDate).format('YYYY-MM-DD') || old.holidayName !== item.holidayName;

      if (isChanged) {
        payload.holidays.push({
          action: 'update',
          id: item.id,
          holidayDate: dayjs(item.holidayDate).format('YYYY-MM-DD'),
          holidayName: item.holidayName,
          remark: '',
        });
      }
    }

    // 🔴 DELETE (อยู่ original แต่ไม่มีใน current)
    for (const oldItem of original) {
      const exists = currentMap.has(oldItem.id);

      if (!exists) {
        payload.holidays.push({
          action: 'delete',
          id: oldItem.id,
        });
      }
    }
    console.log(payload);

    this.masterService.manageHolidayMaster(payload).subscribe({
      next: (res: any) => {
        console.log(res);

        this.swalService.success('สำร็จ');
        this.resetHolidayForm();

        this.closeHolidayModal();

        this.getHoliday();
      },

      error: (err) => {
        console.error('Get Holiday Error : ', err);
        this.swalService.warning(err.error.message);
      },
    });
  }

  closeHolidayModal(): void {
    this.resetHolidayForm();

    this.isHolidayModalOpen.set(false);
  }

  disableNotSelectedYear = (current: Date): boolean => {
    if (!current) {
      return false;
    }

    const selectedYear = Number(this.selectedYear);

    const currentYear = dayjs(current).year();

    // ห้ามเลือกปีอื่น
    const invalidYear = currentYear !== selectedYear;

    // ห้ามเลือกวันย้อนหลัง
    const today = dayjs().startOf('day');
    const isPastDate = dayjs(current).isBefore(today);

    return invalidYear || isPastDate;
  };

  get defaultPickerValue(): Date {
    return new Date(this.selectedYear, 0, 1);
  }

  get exportAnnouncementText(): string {
    return this.exportAnnouncementDate ? this.formatThaiFullDate(this.exportAnnouncementDate) : '';
  }

  get exportSubjectYear(): number {
    return Number(this.exportYear) + 543;
  }

  getHolidayDayName(item: any): string {
    if (item.day) {
      return item.day;
    }

    return this.getThaiDayName(item.holidayDate);
  }

  getHolidayDateDay(item: any): string {
    return item.holidayDate ? dayjs(item.holidayDate).date().toString() : '';
  }

  getHolidayDateMonth(item: any): string {
    return item.holidayDate ? this.getThaiMonthName(item.holidayDate) : '';
  }

  private getBuddhistYear(date: Date): number {
    return dayjs(date).year() + 543;
  }

  private formatThaiFullDate(date: Date): string {
    return `${dayjs(date).date()} ${this.getThaiMonthName(date)} ${this.getBuddhistYear(date)}`;
  }

  private getThaiDayName(date: Date | string): string {
    const days = [
      'วันอาทิตย์',
      'วันจันทร์',
      'วันอังคาร',
      'วันพุธ',
      'วันพฤหัสบดี',
      'วันศุกร์',
      'วันเสาร์',
    ];

    return days[dayjs(date).day()] ?? '';
  }

  private getThaiMonthName(date: Date | string): string {
    const months = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ];

    return months[dayjs(date).month()] ?? '';
  }

  isPastHoliday(date: Date | string): boolean {
    if (!date) {
      return false;
    }

    const d = new Date(date);
    const today = new Date();

    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return d < today;
  }

  isLockedRow(item: any): boolean {
    return this.isEditMode && this.isPastHoliday(item.holidayDate);
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    const holidays = this.holidayFormList();

    // check required
    holidays.forEach((item, index) => {
      if (!item.holidayDate) {
        errors.push(`รายการที่ ${index + 1} กรุณาเลือกวันที่`);
      }

      if (!item.holidayName || !item.holidayName.trim()) {
        errors.push(`รายการที่ ${index + 1} กรุณากรอกรายละเอียดวันหยุด`);
      }
    });

    // check duplicate date
    const dateMap = new Map<string, number[]>();

    holidays.forEach((item, index) => {
      if (!item.holidayDate) return;

      const date = dayjs(item.holidayDate).format('YYYY-MM-DD');

      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }

      dateMap.get(date)?.push(index + 1);
    });

    dateMap.forEach((rows) => {
      if (rows.length > 1) {
        errors.push(`วันที่ซ้ำกันในรายการ ${rows.join(', ')}`);
      }
    });

    return errors;
  }

  isSaveDisabled(): boolean {
    // manual mode
    if (this.mode === 'manual') {
      return this.getValidationErrors().length !== 0 || this.holidayFormList().length === 0;
    }

    // excel mode
    if (this.mode === 'excel') {
      return !this.selectedExcelFile;
    }

    return true;
  }

  downloadTemplate(): void {
    this.masterService.downloadHolidayTemplate(this.selectedYear.toString()).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;

        a.download = 'holiday-template.xlsx';

        a.click();

        window.URL.revokeObjectURL(url);
      },

      error: () => {
        console.error('ไม่สามารถดาวน์โหลด Template ได้');
      },
    });
  }

  onUploadExcel(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(file.type)) {
      this.swalService.warning('กรุณาเลือกไฟล์ Excel เท่านั้น');

      return;
    }

    this.selectedExcelFile = file;
  }

  importHolidayExcel(): void {
    if (!this.selectedExcelFile) {
      this.swalService.warning('กรุณาเลือกไฟล์ Excel');

      return;
    }

    const formData = new FormData();

    formData.append('File', this.selectedExcelFile);
    formData.append('Year', this.selectedYear.toString());
    formData.append('CreatedBy', this.authService.userData().CODEMPID);

    this.masterService.importHolidayExcel(formData).subscribe({
      next: (res) => {
        console.log(res);
        this.swalService.success('Import สำเร็จ');

        this.selectedExcelFile = null;

        this.resetHolidayForm();

        this.closeHolidayModal();

        this.getHoliday();
      },

      error: (err) => {
        console.error(err?.error?.message || 'Import ไม่สำเร็จ');
      },
    });
  }

  onSubmitHoliday(): void {
    if (this.mode === 'manual') {
      this.saveHoliday();

      return;
    }

    if (this.mode === 'excel') {
      this.importHolidayExcel();
      return;
    }
  }

  resetHolidayForm(): void {
    // reset table
    this.holidayFormList.set([]);

    // reset excel
    this.selectedExcelFile = null;

    // reset mode
    this.mode = 'manual';

    // reset year
    this.selectedYear = new Date().getFullYear() + 1;

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}

interface Holiday {
  id: number;
  year: number;
  holidayDate: Date;
  holidayName: string;
  description: string;
  createdBy: string;
  createdDate: string;
}

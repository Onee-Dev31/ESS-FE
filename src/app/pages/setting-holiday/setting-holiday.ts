import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
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

  searchYear: number = new Date().getFullYear();
  searchHolidayName = '';

  isHolidayModalOpen = signal(false);
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
      holidayDate: x.HOLIDAY_DATE ? new Date(x.HOLIDAY_DATE) : null,
      holidayName: x.HOLIDAY_NAME,
    }));
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
        this.getHoliday();
        this.isHolidayModalOpen.set(false);
      },

      error: (err) => {
        console.error('Get Holiday Error : ', err);
        this.swalService.warning(err.error.message);
      },
    });
  }

  closeHolidayModal(): void {
    this.isHolidayModalOpen.set(false);

    this.holidayFormList.set([]);
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

  isPastHoliday(date: Date | string): boolean {
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

  canSave(): boolean {
    return this.getValidationErrors().length === 0;
  }

  downloadTemplate(): void {
    this.masterService.downloadHolidayTemplate().subscribe({
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

    this.selectedExcelFile = file;

    // validate file
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(file.type)) {
      this.swalService.warning('กรุณาเลือกไฟล์ Excel เท่านั้น');

      return;
    }

    const selectYear = '2027';

    const formData = new FormData();

    formData.append('File', file);
    formData.append('Year', selectYear);
    formData.append('CreatedBy', '');

    this.masterService.importHolidayExcel(formData).subscribe({
      next: () => {
        this.swalService.success('Import สำเร็จ');

        this.getHoliday();
      },

      error: (err) => {
        console.error('Get Holiday Error : ', err?.error?.message || 'Import ไม่สำเร็จ');
      },
    });
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

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
  private swalService = inject(SwalService);
  dateUtil = inject(DateUtilityService);

  loading = signal(false);
  years: number[] = [];
  futureYears: number[] = [];
  holidays = signal<any[]>([]);

  searchYear: number | null = new Date().getFullYear();
  searchHolidayName = '';

  isHolidayModalOpen = signal(false);
  selectedYear = new Date().getFullYear() + 1;
  holidayFormList = signal<any[]>([]);

  formData = {
    year: 2026,
    holidayDate: '',
    holidayName: '',
    description: '',
  };

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
      holidayDate: x.HOLIDAY_DATE,
      holidayName: x.HOLIDAY_NAME,
    }));
  }

  addHoliday() {
    console.log('Holiday');
    this.isHolidayModalOpen.set(true);
  }

  addHolidayRow(): void {
    const data = this.holidayFormList();

    data.push({
      id: crypto.randomUUID(),
      holidayDate: '',
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

        console.log(mapped);
        this.holidayFormList.set(mapped);
      },

      error: (err) => {
        console.error(err);
      },
    });
  }

  saveHoliday(): void {
    const payload = this.holidayFormList().map((x) => ({
      year: this.selectedYear,
      holidayDate: x.holidayDate,
      holidayName: x.holidayName,
    }));

    console.log(payload);
    // this.teamCalendarService.saveHoliday(payload).subscribe({
    //   next: () => {
    //     alert('Save Success');

    //     this.closeHolidayModal();

    //     this.getHoliday();
    //   },

    //   error: (err) => {
    //     console.error(err);
    //   },
    // });
  }

  closeHolidayModal(): void {
    this.isHolidayModalOpen.set(false);

    this.holidayFormList.set([]);
  }

  disableNotSelectedYear = (current: Date): boolean => {
    if (!current) return false;

    return current.getFullYear() !== this.selectedYear;
  };

  get defaultPickerValue(): Date {
    return new Date(this.selectedYear, 0, 1);
  }
}

interface Holiday {
  id: number;
  year: number;
  holidayDate: string;
  holidayName: string;
  description: string;
  createdBy: string;
  createdDate: string;
}

import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  EventEmitter,
  Output,
  Input,
  inject,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AllowanceService,
  AllowanceItem,
  AllowanceRequest,
} from '../../../services/allowance.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast';
import { forkJoin } from 'rxjs';
import { SwalService } from '../../../services/swal.service';
import { DateUtilityService } from '../../../services/date-utility.service';
import { MealAllowanceRate } from '../../../interfaces';

@Component({
  selector: 'app-allowance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './allowance-form.html',
  styleUrls: ['./allowance-form.scss'],
})
export class AllowanceFormComponent implements OnInit, OnChanges {
  // @Input() requestId: string = '';
  @Input() requests: any = null;
  @Output() onClose = new EventEmitter<void>();

  private allowanceService = inject(AllowanceService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private swalService = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);
  dateUtil = inject(DateUtilityService);

  loadedRequest?: AllowanceRequest;

  thaiMonths = [
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
  private readonly currentYearBE = new Date().getFullYear() + 543;
  years = [this.currentYearBE - 1, this.currentYearBE, this.currentYearBE + 1];
  selectedMonthIndex: number = new Date().getMonth(); // 0-based
  selectedYearBE: number = this.currentYearBE;
  totalAmount: number = 0;
  totalHoursStr: string = '0.00';
  logs: AllowanceItem[] = [];

  MODE_EDIT: boolean = false;
  isLoading = true;

  get referredBackReason(): string {
    const raw = this.requests?.approvals_json;
    if (!raw) return this.requests?.rejectionReason ?? '';
    try {
      const steps = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(steps)) return '';
      for (const step of steps) {
        if (step.remark?.startsWith('ส่งกลับแก้ไข:')) {
          return step.remark.replace('ส่งกลับแก้ไข:', '').trim();
        }
      }
    } catch {}
    return '';
  }

  isPolicyPopupOpen = signal(false);
  rates = signal<MealAllowanceRate[]>([]);

  ngOnInit(): void {
    this.getRates();
    if (!this.requests) {
      this.loadData();
    } else {
      // edit mode: ข้อมูลมาจาก mapData() แล้ว ไม่ต้องรอ getRates() ก่อนแสดง form
      this.isLoading = false;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requests'] && this.requests && this.requests !== '') {
      this.MODE_EDIT = true;
      this.mapData();
      this.enrichShiftTimes();
      return;
    }
  }

  loadData() {
    this.generateCalendar();
  }

  private mapData() {
    this.logs = this.requests.details.map((item: any) => ({
      date: (item.work_date ?? '').split('T')[0],
      dayType: item.day_type,
      timeIn: item.actual_checkin,
      timeOut: item.actual_checkout,
      hours: item.extra_hours,
      amount: item.rate_amount ?? 0,
      actualExtraHours: item.extra_hours ?? item.total_hours ?? 0,
      displayHours: this.formatDuration(item.extra_hours),
      selected: true,
      description: item.description,
      shiftCode: item.shift_code,
      shiftStart: item.scheduled_start,
      shiftEnd: item.scheduled_end,
      isEligible: true,
      totalHoursText: item.total_hours_text,
      rateId: item.rate_id,
    } as AllowanceItem));
  }

  private enrichShiftTimes() {
    if (this.logs.every((l) => l.shiftStart && l.shiftEnd)) return;

    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    if (!employeeCode || this.logs.length === 0) return;

    const months = new Map<string, { year: number; month: number }>();
    for (const log of this.logs) {
      if (log.shiftStart && log.shiftEnd) continue;
      const d = new Date(log.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      months.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    if (months.size === 0) return;

    const calls = Array.from(months.values()).map(({ year, month }) =>
      this.allowanceService.getEligibleDates(employeeCode, year, month),
    );

    forkJoin(calls).subscribe({
      next: (responses) => {
        const shiftData = new Map<string, { shiftStart: string; shiftEnd: string }>();
        for (const res of responses) {
          for (const item of res.data ?? []) {
            shiftData.set(item.work_date.split('T')[0], {
              shiftStart: item.scheduled_start,
              shiftEnd: item.scheduled_end,
            });
          }
        }
        this.logs = this.logs.map((log) => {
          if (log.shiftStart && log.shiftEnd) return log;
          const shift = shiftData.get(log.date);
          if (!shift?.shiftStart) return log;
          return { ...log, shiftStart: shift.shiftStart, shiftEnd: shift.shiftEnd };
        });
        this.cdr.detectChanges();
      },
    });
  }

  dayTypeLabel(code: string | undefined): string {
    const map: Record<string, string> = {
      W: 'วันทำงานปกติ',
      H: 'วันหยุด',
      T: 'วันหยุดประเพณี',
      L: 'วันลา',
    };
    return code ? (map[code] ?? code) : '-';
  }

  formatDuration(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0) return `${m} นาที`;
    if (m === 0) return `${h} ชม.`;
    return `${h}:${m}`;
  }

  isKeep(): number {
    const selectedLogs = this.logs.filter((log) => log.selected);
    return selectedLogs.length;
  }

  isDelete(): number {
    const selectedLogs = this.logs.filter((log) => !log.selected);
    return selectedLogs.length;
  }

  totalClaims(): string {
    const selectedLogs = this.logs.filter((log) => log.selected);
    const total = selectedLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
    return total.toLocaleString('en-US') + '.-';
  }

  hasDelete(): boolean {
    const selectedLogs = this.logs.filter((log) => log.selected);
    if (selectedLogs.length === 0) {
      return true;
    }
    return false;
  }

  hasInvalid(): boolean {
    const hasSelected = this.logs.some((log) => log.selected);

    // MODE_EDIT และไม่มีเลือกอะไรเลย = ลบได้
    if (this.MODE_EDIT && !hasSelected) {
      return false;
    }

    if (!hasSelected) {
      return true;
    }

    return this.logs.some(
      (log) => log.selected && (!log.description || log.description.trim() === ''),
    );
  }

  totalHour(): string {
    const selectedLogs = this.logs.filter((log) => log.selected);
    const total = selectedLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    return this.dateUtil.hoursToHHMM(total);
  }

  generateCalendar() {
    const existingRequest = this.loadedRequest;
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    const yearCE = this.selectedYearBE - 543; // API รับปี ค.ศ.
    const month = this.selectedMonthIndex + 1; // 0-based → 1-based

    this.allowanceService.getEligibleDates(employeeCode, yearCE, month).subscribe({
      next: (res) => {
        console.log(res);
        this.logs = (res.data ?? []).map((item) => {
          const dateStr = item.work_date.split('T')[0]; // "2026-03-02"
          const eligible = item.is_eligible === 1;

          const log: AllowanceItem = {
            date: dateStr,
            dayType: item.day_type,
            timeIn: item.actual_checkin,
            timeOut: item.actual_checkout,
            hours: item.rounded_hours,
            amount: item.rate_amount ?? 0,
            actualExtraHours: item.total_hours,
            displayHours: item.total_hours_text,
            selected: false,
            description: '',
            shiftCode: item.shift_code,
            shiftStart: item.scheduled_start,
            shiftEnd: item.scheduled_end,
            isEligible: eligible,
            totalHoursText: item.total_hours_text,
            rateId: item.rate_id,
          };

          // ถ้าเป็น request ที่บันทึกไว้แล้ว ให้ override ด้วยค่าที่บันทึก
          const saved = existingRequest?.items.find((i) => i.date === dateStr);
          if (saved) {
            log.selected = saved.selected;
            log.description = saved.description;
            log.amount = saved.amount;
            log.hours = saved.hours;
            log.displayHours = saved.displayHours;
            log.actualExtraHours = saved.actualExtraHours;
          }

          console.log(log);
          return log;
        });
        this.updateTotal();
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.warning('ไม่สามารถโหลดรายการวันที่มีสิทธิ์เบิกได้');
        this.cdr.markForCheck();
      },
    });
  }

  onInputChange(log: AllowanceItem) {
    if (log.description && log.description.trim() !== '') {
      log.selected = true;
    }
    this.updateTotal();
  }

  onToggleCheck(log: AllowanceItem, descInput?: HTMLInputElement) {
    this.updateTotal();
    if (log.selected && descInput) {
      setTimeout(() => descInput.focus(), 0);
    }
  }

  updateTotal() {
    const selectedLogs = this.logs.filter((log) => log.selected);

    this.totalAmount = selectedLogs.reduce((sum, current) => sum + (current.amount || 0), 0);

    let totalExtraMinutes = selectedLogs.reduce(
      (sum, current) => sum + (current.actualExtraHours || 0) * 60,
      0,
    );
    const hours = Math.floor(totalExtraMinutes / 60);
    const minutes = Math.round(totalExtraMinutes % 60);
    this.totalHoursStr = `${hours}.${minutes.toString().padStart(2, '0')}`;
  }

  onSubmit() {
    const selectedLogs = this.logs.filter((l) => l.selected);

    if (this.MODE_EDIT && selectedLogs.length === 0) {
      this.swalService.confirm('ยืนยันการลบรายการเบิกทั้งหมด').then((result) => {
        if (!result.isConfirmed) return;
        this.swalService.loading('กำลังบันทึกข้อมูล...');
        // console.log(this.requests);
        this.allowanceService.deleteClaim(this.requests.id).subscribe({
          next: () => {
            this.swalService.success('ลบรายการสำเร็จ');
            this.loadData();
          },
          error: () => this.swalService.error('เกิดข้อผิดพลาดในการลบรายการ'),
        });
      });
      return;
    }

    const missingDesc = selectedLogs.filter((l) => !l.description?.trim());
    if (missingDesc.length > 0) {
      this.toastService.warning('กรุณากรอกรายละเอียดการเบิกให้ครบถ้วน');
      return;
    }

    const employeeCode = this.authService.userData()?.CODEMPID ?? '';

    if (this.MODE_EDIT) {
      this.swalService.loading('กำลังบันทึกข้อมูล...');
      this.allowanceService
        .updateClaim(this.requests.claimId, {
          details: selectedLogs.map((log) => ({
            work_date: log.date,
            shift_code: log.shiftCode,
            day_type: log.dayType,
            actual_checkin: log.timeIn,
            actual_checkout: log.timeOut,
            scheduled_start: log.shiftStart,
            scheduled_end: log.shiftEnd,
            extra_hours: log.actualExtraHours ?? 0,
            rate_id: log.rateId,
            rate_amount: log.amount,
            description: log.description,
          })) as any,
        })
        .subscribe({
          next: () => {
            const msg =
              this.requests?.status === 'Referred Back'
                ? 'ส่งคืนสำเร็จ ระบบเริ่มกระบวนการอนุมัติใหม่และแจ้งเตือนผู้อนุมัติทางอีเมลแล้ว'
                : 'แก้ไขใบเบิกสำเร็จ';
            this.swalService.success(msg);
            this.closeModal();
          },
          error: () => this.swalService.error('เกิดข้อผิดพลาดในการแก้ไข'),
        });
      return;
    }

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.allowanceService
      .createClaim({
        employee_code: employeeCode,
        details: selectedLogs.map((log) => ({
          work_date: log.date,
          shift_code: log.shiftCode,
          day_type: log.dayType,
          actual_checkin: log.timeIn,
          actual_checkout: log.timeOut,
          scheduled_start: log.shiftStart,
          scheduled_end: log.shiftEnd,
          extra_hours: log.actualExtraHours,
          rate_id: log.rateId,
          rate_amount: log.amount,
          description: log.description,
        })),
      })
      .subscribe({
        next: (res) => {
          // this.toastService.success(`บันทึกสำเร็จ เลขที่ใบเบิก: ${res.data.voucherNo}`);
          this.swalService.success(`บันทึกสำเร็จ เลขที่ใบเบิก: ${res.data.voucherNo}`);
          this.closeModal();
        },
        error: () => {
          // this.toastService.warning('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
          this.swalService.success('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  closeModal() {
    this.onClose.emit();
  }

  getRates() {
    this.isLoading = true;
    this.allowanceService.getRates().subscribe({
      next: (res) => {
        // console.log(res);
        this.rates.set(res.data);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }
}

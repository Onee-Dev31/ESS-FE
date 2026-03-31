import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceService, AllowanceItem, AllowanceRequest } from '../../../services/allowance.service';
import { AllowanceApiService } from '../../../services/allowance-api.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast';
import { switchMap } from 'rxjs';
import { SwalService } from '../../../services/swal.service';

@Component({
  selector: 'app-allowance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './allowance-form.html',
  styleUrls: ['./allowance-form.scss']
})
export class AllowanceFormComponent implements OnInit, OnChanges {
  // @Input() requestId: string = '';
  @Input() requests: any = null;
  @Output() onClose = new EventEmitter<void>();

  private allowanceService = inject(AllowanceService);
  protected allowanceApi = inject(AllowanceApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private swalService = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);

  loadedRequest?: AllowanceRequest;

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  private readonly currentYearBE = new Date().getFullYear() + 543;
  years = [this.currentYearBE - 1, this.currentYearBE, this.currentYearBE + 1];
  selectedMonthIndex: number = new Date().getMonth();   // 0-based
  selectedYearBE: number = this.currentYearBE;
  totalAmount: number = 0;
  totalHoursStr: string = '0.00';
  logs: AllowanceItem[] = [];

  MODE_EDIT: boolean = false;

  isPolicyPopupOpen = signal(false);
  protected readonly rates = computed(() => this.allowanceApi.rates());

  ngOnInit(): void {
    if (!this.allowanceApi.rates().length) {
      this.allowanceApi.reloadRates();
    }
    if (!this.requests) {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // if (changes['requestId'] && !changes['requestId'].firstChange) {
    //   this.loadData();
    // }
    if (changes['requests'] && this.requests && this.requests !== '') {
      // console.log('requests เข้ามาแล้ว:', this.requests);
      this.MODE_EDIT = true;
      this.mapData();
      return;
    }
  }

  loadData() {
    this.generateCalendar()
    // if (!this.requestId) {
    //   this.allowanceService.generateNextAllowanceId().pipe(
    //     switchMap(id => {
    //       this.requestId = id;
    //       return this.allowanceService.getAllowanceRequestById(id);
    //     })
    //   ).subscribe(existing => {
    //     this.loadedRequest = existing;
    //     this.generateCalendar();
    //     this.cdr.markForCheck();
    //   });
    // } else {
    //   this.allowanceService.getAllowanceRequestById(this.requestId).subscribe(existing => {
    //     this.loadedRequest = existing;
    //     this.generateCalendar();
    //     this.cdr.markForCheck();
    //   });
    // }
  }

  mapData() {
    this.logs = this.requests.details.map((item: any) => {
      return {
        date: item.work_date,
        dayType: item.day_type,
        timeIn: item.actual_checkin,
        timeOut: item.actual_checkout,
        hours: item.rounded_hours,
        amount: item.rate_amount ?? 0,
        actualExtraHours: item.total_hours,
        displayHours: item.total_hours_text,
        selected: true,
        description: item.description,
        shiftCode: item.shift_code,
        isEligible: true,
        totalHoursText: item.total_hours_text,
        rateId: item.rate_id,
      } as AllowanceItem;
    })
  }

  generateCalendar() {
    const existingRequest = this.loadedRequest;
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    const yearCE = this.selectedYearBE - 543; // API รับปี ค.ศ.
    const month = this.selectedMonthIndex + 1; // 0-based → 1-based

    this.allowanceApi.getEligibleDates(employeeCode, yearCE, month)
      .subscribe({
        next: (res) => {
          this.logs = (res.data ?? []).map(item => {
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
              isEligible: eligible,
              totalHoursText: item.total_hours_text,
              rateId: item.rate_id,
            };

            // ถ้าเป็น request ที่บันทึกไว้แล้ว ให้ override ด้วยค่าที่บันทึก
            const saved = existingRequest?.items.find(i => i.date === dateStr);
            if (saved) {
              log.selected = saved.selected;
              log.description = saved.description;
              log.amount = saved.amount;
              log.hours = saved.hours;
              log.displayHours = saved.displayHours;
              log.actualExtraHours = saved.actualExtraHours;
            }

            return log;
          });
          this.updateTotal();
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.warning('ไม่สามารถโหลดรายการวันที่มีสิทธิ์เบิกได้');
          this.cdr.markForCheck();
        }
      });
  }

  autoCalculate(log: AllowanceItem) {
    const calculated = this.allowanceService.calculateAllowance(log);
    Object.assign(log, calculated);
    this.updateTotal();
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
    const selectedLogs = this.logs.filter(log => log.selected);

    this.totalAmount = selectedLogs.reduce((sum, current) => sum + (current.amount || 0), 0);

    let totalExtraMinutes = selectedLogs.reduce((sum, current) => sum + ((current.actualExtraHours || 0) * 60), 0);
    const hours = Math.floor(totalExtraMinutes / 60);
    const minutes = Math.round(totalExtraMinutes % 60);
    this.totalHoursStr = `${hours}.${minutes.toString().padStart(2, '0')}`;
  }

  onSubmit() {
    const selectedLogs = this.logs.filter(l => l.selected);

    if (selectedLogs.length === 0) {
      this.toastService.warning('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
      return;
    }

    const missingDesc = selectedLogs.filter(l => !l.description?.trim());
    if (missingDesc.length > 0) {
      this.toastService.warning('กรุณากรอกรายละเอียดการเบิกให้ครบถ้วน');
      return;
    }

    const employeeCode = this.authService.userData()?.CODEMPID ?? '';

    if (this.MODE_EDIT) {
      this.swalService.info('MOCK')
      this.closeModal();
      return;
    }

    this.allowanceApi.createClaim({
      employee_code: employeeCode,
      details: selectedLogs.map(log => ({
        work_date: log.date,
        shift_code: log.shiftCode,
        day_type: log.dayType,
        actual_checkin: log.timeIn,
        actual_checkout: log.timeOut,
        extra_hours: log.actualExtraHours,
        rate_id: log.rateId,
        rate_amount: log.amount,
        description: log.description,
      })),
    }).subscribe({
      next: (res) => {
        this.toastService.success(`บันทึกสำเร็จ เลขที่ใบเบิก: ${res.data.voucherNo}`);
        this.closeModal();
      },
      error: () => {
        this.toastService.warning('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      },
    });
  }

  closeModal() {
    this.onClose.emit();
  }
}

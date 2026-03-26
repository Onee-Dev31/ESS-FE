import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceService, AllowanceRequest, AllowanceItem } from '../../../services/allowance.service';
import { AllowanceApiService } from '../../../services/allowance-api.service';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast';
import { WELFARE_TYPES } from '../../../constants/welfare-types.constant';
import { DateUtilityService } from '../../../services/date-utility.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-allowance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './allowance-form.html',
  styleUrls: ['./allowance-form.scss']
})
export class AllowanceFormComponent implements OnInit, OnChanges {
  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  private allowanceService = inject(AllowanceService);
  protected allowanceApi = inject(AllowanceApiService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);
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

  isPolicyPopupOpen = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requestId'] && !changes['requestId'].firstChange) {
      this.loadData();
    }
  }

  loadData() {
    if (!this.requestId) {
      this.allowanceService.generateNextAllowanceId().pipe(
        switchMap(id => {
          this.requestId = id;
          return this.allowanceService.getAllowanceRequestById(id);
        })
      ).subscribe(existing => {
        this.loadedRequest = existing;
        this.generateCalendar();
        this.cdr.markForCheck();
      });
    } else {
      this.allowanceService.getAllowanceRequestById(this.requestId).subscribe(existing => {
        this.loadedRequest = existing;
        this.generateCalendar();
        this.cdr.markForCheck();
      });
    }
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
    const invalid = this.logs.filter(l => l.selected && (!l.description || l.description.trim() === ''));
    if (invalid.length > 0) {
      this.toastService.warning('กรุณากรอกรายละเอียดการเบิกให้ครบถ้วน');
      return;
    }
    if (!this.totalAmount || this.totalAmount <= 0) {
      this.toastService.warning('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }

    const items: AllowanceItem[] = this.logs
      .filter(log => log.selected)
      .map(log => ({
        date: log.date,
        dayType: log.dayType,
        timeIn: log.timeIn,
        timeOut: log.timeOut,
        description: log.description,
        hours: parseFloat(log.displayHours || '0'),
        amount: log.amount,
        selected: true
      }));

    if (items.length === 0) {
      this.toastService.warning('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
      return;
    }

    this.allowanceService.getAllowanceRequestById(this.requestId).subscribe(existingRequest => {
      if (existingRequest) {
        this.allowanceService.updateAllowanceRequest(this.requestId, {
          ...existingRequest,
          items: items
        }).subscribe({
          next: () => {
            this.toastService.success('อัปเดตรายการเบิกเรียบร้อยแล้ว');
            this.closeModal();
          },
        });
      } else {
        this.userService.getUserProfile().subscribe(profile => {
          const newRequest: AllowanceRequest = {
            id: this.requestId,
            typeId: WELFARE_TYPES.ALLOWANCE,
            createDate: this.dateUtil.getCurrentDateISO(),
            status: 'WAITING_CHECK',
            requester: {
              employeeId: profile.employeeId,
              name: profile.name,
              department: profile.department,
              company: profile.company
            },
            items: items
          };
          this.allowanceService.addAllowanceRequest(newRequest).subscribe(() => {
            this.toastService.success('บันทึกสร้างรายการเบิกเรียบร้อยแล้ว');
            this.closeModal();
          });
        });
      }
    });
  }

  closeModal() {
    this.onClose.emit();
  }
}

/**
 * @file Allowance Form
 * @description Logic for Allowance Form
 */

// Section: Imports
import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceService, AllowanceRequest, AllowanceItem } from '../../../services/allowance.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast';
import { WELFARE_TYPES } from '../../../constants/welfare-types.constant';
import { DateUtilityService } from '../../../services/date-utility.service';
import { switchMap } from 'rxjs';

// Section: Logic
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
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);
  private cdr = inject(ChangeDetectorRef);

  loadedRequest?: AllowanceRequest;

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษาพยน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2568, 2569, 2570];
  selectedMonthIndex: number = 9;
  selectedYearBE: number = 2568;
  totalAmount: number = 0;
  totalHoursStr: string = '0.00';
  logs: any[] = [];

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

    this.allowanceService.getMockAllowanceLogs(this.selectedMonthIndex, this.selectedYearBE)
      .subscribe(rawLogs => {
        this.logs = rawLogs.map(item => {
          const matchingItem = existingRequest?.items.find(i => i.date === item.date);

          const log = {
            date: item.date,
            dayType: item.dayType,
            timeIn: item.timeIn,
            timeOut: item.timeOut,
            displayHours: '0.00',
            actualExtraHours: 0,
            amount: 0,
            selected: item.selected,
            description: item.description,
            shiftCode: item.shiftCode
          };

          if (matchingItem) {
            log.timeIn = matchingItem.timeIn;
            log.timeOut = matchingItem.timeOut;
            log.amount = matchingItem.amount;
            log.selected = matchingItem.selected;
            log.description = matchingItem.description;
          }

          this.autoCalculate(log);

          return log;
        });
        this.cdr.markForCheck();
      });
  }

  autoCalculate(log: any) {
    if (!log.selected || !log.timeIn || !log.timeOut) {
      log.displayHours = '0.00';
      log.actualExtraHours = 0;
      log.amount = 0;
      this.updateTotal();
      return;
    }

    const [startHour, startMinute] = log.timeIn.split(':').map(Number);
    const [endHour, endMinute] = log.timeOut.split(':').map(Number);

    let totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (totalMinutes < 0) totalMinutes += 1440;

    let extraMinutes = totalMinutes - 540;
    if (extraMinutes < 0) extraMinutes = 0;


    const extraHoursDecimal = extraMinutes / 60;
    log.actualExtraHours = extraHoursDecimal;

    const hours = Math.floor(extraMinutes / 60);
    const minutes = extraMinutes % 60;
    log.displayHours = `${hours}.${minutes.toString().padStart(2, '0')}`;

    if (extraHoursDecimal >= 2) {
      if (extraHoursDecimal <= 4) log.amount = 150;
      else if (extraHoursDecimal <= 8) log.amount = 225;
      else if (extraHoursDecimal <= 12) log.amount = 300;
      else if (extraHoursDecimal <= 16) log.amount = 375;
      else if (extraHoursDecimal <= 20) log.amount = 450;
      else log.amount = 525;
    } else {
      log.amount = 0;
    }

    this.updateTotal();
  }

  onInputChange(log: any) {
    if (log.description && log.description.trim() !== '') {
      log.selected = true;
      this.autoCalculate(log);
    }
  }

  onToggleCheck(log: any) {
    this.autoCalculate(log);
  }

  updateTotal() {
    const selectedLogs = this.logs.filter(log => log.selected);

    this.totalAmount = selectedLogs.reduce((sum, current) => sum + (current.amount || 0), 0);

    let totalExtraMinutes = selectedLogs.reduce((sum, current) => sum + (current.actualExtraHours * 60), 0);
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
        hours: parseFloat(log.displayHours),
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

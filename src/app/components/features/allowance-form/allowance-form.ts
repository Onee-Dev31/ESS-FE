import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceService, AllowanceRequest, AllowanceItem } from '../../../services/allowance.service';
import { AlertService } from '../../../services/alert.service'; // เพิ่ม AlertService
import { WELFARE_TYPES } from '../../../services/vehicle.service';
import { switchMap, of, forkJoin } from 'rxjs';

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
  private alertService = inject(AlertService); // ฉีด AlertService
  private cdr = inject(ChangeDetectorRef);

  loadedRequest?: AllowanceRequest;

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2568, 2569, 2570];
  selectedMonthIndex: number = 9;
  selectedYearBE: number = 2568;
  totalAmount: number = 0;
  totalHoursStr: string = '0.00';
  logs: any[] = [];

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
      else if (extraHoursDecimal <= 24) log.amount = 525;
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
      this.alertService.showWarning('กรุณากรอกรายละเอียดการเบิกให้ครบถ้วน'); // ใช้ AlertService
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
        hours: parseFloat(log.displayHours), // ประมาณค่า
        amount: log.amount,
        selected: true
      }));

    if (items.length === 0) {
      this.alertService.showWarning('กรุณาเลือกรายการอย่างน้อย 1 รายการ'); // ใช้ AlertService
      return;
    }

    this.allowanceService.getAllowanceRequestById(this.requestId).subscribe(existingRequest => {
      if (existingRequest) {
        this.allowanceService.updateAllowanceRequest(this.requestId, {
          ...existingRequest,
          items: items
        }).subscribe(() => {
          this.alertService.showSuccess(`อัปเดตรายการ ${this.requestId} เรียบร้อย`); // ใช้ AlertService
          this.closeModal();
        });
      } else {
        const newRequest: AllowanceRequest = {
          id: this.requestId,
          typeId: WELFARE_TYPES.ALLOWANCE,
          createDate: new Date().toISOString().split('T')[0], // วันที่ปัจจุบัน (yyyy-mm-dd)
          status: 'รอตรวจสอบ',
          items: items
        };
        this.allowanceService.addAllowanceRequest(newRequest).subscribe(() => {
          this.alertService.showSuccess(`บันทึกสำเร็จ ยอดรวม ${this.totalAmount} บาท (รวม ${this.totalHoursStr} ชม.)`); // ใช้ AlertService
          this.closeModal();
        });
      }
    });
  }

  closeModal() {
    this.onClose.emit();
  }
}
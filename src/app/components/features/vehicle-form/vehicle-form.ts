import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService, RequestItem, VehicleRequest } from '../../../services/transport.service';
import { AlertService } from '../../../services/alert.service';
import { WELFARE_TYPES } from '../../../constants/welfare-types.constant';
import { THAI_MONTHS, YEARS_CONFIG } from '../../../config/constants';
import { DateUtilityService } from '../../../services/date-utility.service';

interface LogItem {
  date: string;
  dayType: string;
  timeIn: string;
  timeOut: string;
  amount: number;
  selected: boolean;
  description: string;
  shiftCode?: string;
}

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-form.html',
  styleUrls: ['./vehicle-form.scss']
})
export class VehicleFormComponent implements OnInit, OnChanges {
  @Input() requestId: string = '';

  @Output() onClose = new EventEmitter<void>();

  private transportService = inject(TransportService);
  private alertService = inject(AlertService);
  private dateUtil = inject(DateUtilityService);
  private cdr = inject(ChangeDetectorRef);

  loadedRequest?: VehicleRequest;

  thaiMonths = THAI_MONTHS;
  years = YEARS_CONFIG;

  selectedMonthIndex: number = 9;
  selectedYearBE: number = 2568;
  totalAmount: number = 0;
  logs: LogItem[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requestId'] && !changes['requestId'].firstChange) {
      this.loadData();
    }
  }

  loadData() {
    this.transportService.getRequestById(this.requestId).subscribe(existingRequest => {
      this.loadedRequest = existingRequest;
      this.generateCalendar();
      this.cdr.markForCheck();
    });
  }

  // สร้างรายการปฏิทินและดึงข้อมูล Log การลงเวลางาน
  generateCalendar() {
    const existingRequest = this.loadedRequest;

    this.transportService.getMockAttendanceLogs(this.selectedMonthIndex, this.selectedYearBE).subscribe(rawLogs => {
      this.logs = rawLogs.map((item: any) => {
        const matchingItem = existingRequest?.items.find(reqItem => reqItem.date === item.date);

        return {
          date: item.date,
          dayType: item.dayType,
          timeIn: item.timeIn ? String(item.timeIn) : '',
          timeOut: item.timeOut ? String(item.timeOut) : '',
          amount: matchingItem ? matchingItem.amount : 0,
          selected: !!matchingItem,
          description: matchingItem ? matchingItem.description : item.description,
          shiftCode: item.shiftCode
        };
      });

      this.logs.forEach(log => {
        if (log.selected) {
          this.calculateVehicleAmount(log);
        }
      });
      this.updateTotal();
      this.cdr.markForCheck();
    });
  }

  // คำนวณเงินค่ารถ (150 บาท) หากเวลาเข้า-ออกอยู่นอกช่วงปกติ (ก่อน 06:00 หรือหลัง 22:00)
  calculateVehicleAmount(log: LogItem) {
    if (!log.selected) {
      log.amount = 0;
      this.updateTotal();
      return;
    }

    if (!log.timeIn || !log.timeOut || log.timeIn === '' || log.timeOut === '') {
      log.amount = 0;
      this.updateTotal();
      return;
    }

    const [inH] = log.timeIn.split(':').map(Number);
    const [outH] = log.timeOut.split(':').map(Number);

    if (inH < 6 || outH >= 22) {
      log.amount = 150;
    } else {
      log.amount = 0;
    }
    this.updateTotal();
  }

  onInputChange(log: LogItem) {
    if (log.description && log.description.trim() !== '') {
      log.selected = true;
      this.calculateVehicleAmount(log);
    }
  }

  onToggleCheck(log: LogItem) {
    if (log.selected) {
      this.calculateVehicleAmount(log);
    } else {
      log.amount = 0;
      this.updateTotal();
    }
  }

  updateTotal() {
    this.totalAmount = this.logs
      .filter(log => log.selected)
      .reduce((sum, current) => sum + current.amount, 0);
  }

  // ตรวจสอบความถูกต้องและบันทึกรายการเบิกค่ารถ
  onSubmit() {
    const selectedLogs = this.logs.filter(log => log.selected);

    const invalidLogs = selectedLogs.filter(log => {
      const description = log.description ? String(log.description).trim() : '';
      return description === '';
    });

    if (invalidLogs.length > 0) {
      const invalidDates = invalidLogs.map(log => log.date).join(', ');
      this.alertService.showWarning(`กรุณากรอกรายละเอียดการเบิกให้ครบถ้วนสำหรับวันที่: ${invalidDates}`);
      return;
    }

    if (selectedLogs.length === 0 || this.totalAmount === 0) {
      this.alertService.showWarning('ไม่พบรายการที่เข้าเงื่อนไขการเบิกค่ารถ (ก่อน 06:00 หรือ หลัง 22:00)');
      return;
    }

    const requestItems: RequestItem[] = selectedLogs.map(log => ({
      date: log.date,
      description: log.description,
      amount: log.amount
    }));

    this.transportService.getRequestById(this.requestId).subscribe(existingRequest => {
      if (existingRequest) {
        const updatedRequest: VehicleRequest = {
          ...existingRequest,
          items: requestItems
        };
        this.transportService.updateRequest(this.requestId, updatedRequest).subscribe(() => {
          this.alertService.showSuccess(`บันทึกการแก้ไขข้อมูลเรียบร้อย`);
          this.closeModal();
        });
      } else {
        const newRequest: VehicleRequest = {
          id: this.requestId,
          typeId: WELFARE_TYPES.TRANSPORT,
          createDate: this.dateUtil.getCurrentDateISO(),
          status: 'รอตรวจสอบ',
          items: requestItems
        };
        this.transportService.addRequest(newRequest).subscribe(() => {
          this.alertService.showSuccess(`สร้างรายการเบิกเลขที่ ${this.requestId} สำเร็จ\nยอดรวมทั้งสิ้น: ${this.totalAmount} บาท`);
          this.closeModal();
        });
      }
    });
  }

  closeModal() {
    this.onClose.emit();
  }
}


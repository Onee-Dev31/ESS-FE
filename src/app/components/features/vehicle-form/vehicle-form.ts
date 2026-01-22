import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService, RequestItem, VehicleRequest, WELFARE_TYPES } from '../../../services/vehicle.service';

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

  private vehicleService = inject(VehicleService);
  private cdr = inject(ChangeDetectorRef);

  loadedRequest?: VehicleRequest;

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2568, 2569, 2570];

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
    this.vehicleService.getRequestById(this.requestId).subscribe(existingRequest => {
      this.loadedRequest = existingRequest;
      this.generateCalendar();
      this.cdr.markForCheck();
    });
  }

  generateCalendar() {
    const existingRequest = this.loadedRequest;

    this.vehicleService.getMockAttendanceLogs(this.selectedMonthIndex, this.selectedYearBE).subscribe(rawLogs => {
      this.logs = rawLogs.map((item: any) => {
        const matchingItem = existingRequest?.items.find(reqItem => reqItem.date === item.d);

        return {
          date: item.d,
          dayType: item.t,
          timeIn: matchTime(item.in),
          timeOut: matchTime(item.out),
          amount: matchingItem ? matchingItem.amount : 0,
          selected: !!matchingItem,
          description: matchingItem ? matchingItem.desc : item.desc,
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
      log.amount = 150; // เรทคงที่ 150 บาท
    } else {
      log.amount = 0;
    }
    this.updateTotal();
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
      .filter(l => l.selected)
      .reduce((sum, current) => sum + current.amount, 0);
  }

  onSubmit() {
    const selectedLogs = this.logs.filter(l => l.selected);

    const invalidLogs = selectedLogs.filter(l => {
      const desc = l.description ? String(l.description).trim() : '';
      return desc === '';
    });

    if (invalidLogs.length > 0) {
      const invalidDates = invalidLogs.map(l => l.date).join(', ');
      alert(`กรุณากรอกรายละเอียดการเบิกให้ครบถ้วนสำหรับวันที่: ${invalidDates}`);
      return;
    }

    if (selectedLogs.length === 0 || this.totalAmount === 0) {
      alert('ไม่พบรายการที่เข้าเงื่อนไขการเบิกค่ารถ (ก่อน 06:00 หรือ หลัง 22:00)');
      return;
    }

    const requestItems: RequestItem[] = selectedLogs.map(l => ({
      date: l.date,
      desc: l.description,
      amount: l.amount
    }));

    this.vehicleService.getRequestById(this.requestId).subscribe(existing => {
      if (existing) {
        const updated: VehicleRequest = {
          ...existing,
          items: requestItems
        };
        this.vehicleService.updateRequest(this.requestId, updated).subscribe(() => {
          alert(`บันทึกการแก้ไขข้อมูลเรียบร้อย`);
          this.closeModal();
        });
      } else {
        const newReq: VehicleRequest = {
          id: this.requestId,
          typeId: WELFARE_TYPES.TRANSPORT,
          createDate: new Date().toISOString().split('T')[0], // วันที่วันนี้ (YYYY-MM-DD)
          status: 'รอตรวจสอบ',
          items: requestItems
        };
        this.vehicleService.addRequest(newReq).subscribe(() => {
          alert(`สร้างรายการเบิกเลขที่ ${this.requestId} สำเร็จ\nยอดรวมทั้งสิ้น: ${this.totalAmount} บาท`);
          this.closeModal();
        });
      }
    });
  }

  closeModal() {
    this.onClose.emit();
  }
}

function matchTime(t: any): string {
  return t ? String(t) : '';
}
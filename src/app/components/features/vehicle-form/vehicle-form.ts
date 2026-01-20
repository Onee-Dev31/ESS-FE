import { Component, OnInit, EventEmitter, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService, RequestItem, VehicleRequest } from '../../../services/vehicle.service';

interface LogItem {
  date: string;
  dayType: string;
  timeIn: string;
  timeOut: string;
  amount: number;
  selected: boolean;
  description: string;
}

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-form.html',
  styleUrls: ['./vehicle-form.scss']
})
export class VehicleFormComponent implements OnInit {
  @Input() requestId: string = '';

  @Output() onClose = new EventEmitter<void>();

  private vehicleService = inject(VehicleService);

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2568, 2569, 2570];

  selectedMonthIndex: number = 9;
  selectedYearBE: number = 2568;
  totalAmount: number = 0;
  logs: LogItem[] = [];

  ngOnInit(): void {
    // Determine if it's a new request or edit
    // Note: The parent passes a generated ID for new requests, so we need to check if it exists in service
    const existingRequest = this.vehicleService.getRequestById(this.requestId);

    this.generateCalendar(existingRequest);
  }

  generateCalendar(existingRequest?: VehicleRequest) {
    // In a real app, use selectedMonthIndex and selectedYearBE to fetch
    // For now, get static mock data from service
    const rawLogs: any[] = this.vehicleService.getMockAttendanceLogs(this.selectedMonthIndex, this.selectedYearBE);

    this.logs = rawLogs.map((item: any) => {
      // Check if this date was selected in the existing request
      const matchingItem = existingRequest?.items.find(reqItem => reqItem.date === item.d);

      return {
        date: item.d,
        dayType: item.t,
        timeIn: matchTime(item.in),
        timeOut: matchTime(item.out),
        amount: matchingItem ? matchingItem.amount : 0, // Use saved amount if available, will be recalc'd anyway if strictly logic based
        selected: !!matchingItem,
        description: matchingItem ? matchingItem.desc : item.desc
      };
    });

    // Recalculate amounts based on time rules to ensure consistency
    this.logs.forEach(log => {
      // If we are loading an existing request, we might trust the saved amount or consistency check.
      // Here we re-run logic.
      if (log.selected) {
        this.calculateVehicleAmount(log);
      }
    });
    this.updateTotal();
  }

  calculateVehicleAmount(log: LogItem) {
    if (!log.selected) {
      log.amount = 0;
      this.updateTotal();
      return;
    }

    // Basic logic moved from previous version
    // If no time data, can't calc (unless manual override allowed?)
    if (!log.timeIn || !log.timeOut || log.timeIn === '' || log.timeOut === '') {
      log.amount = 0;
      this.updateTotal();
      return;
    }

    const [inH] = log.timeIn.split(':').map(Number);
    const [outH] = log.timeOut.split(':').map(Number);

    if (inH < 6 || outH >= 22) {
      log.amount = 150; // Hardcoded rate
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

    // Validate that if selected, description must be provided
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

    // Map logs back to RequestItems
    const requestItems: RequestItem[] = selectedLogs.map(l => ({
      date: l.date,
      desc: l.description,
      amount: l.amount
    }));

    const existing = this.vehicleService.getRequestById(this.requestId);

    if (existing) {
      // Update
      const updated: VehicleRequest = {
        ...existing,
        items: requestItems
      };
      this.vehicleService.updateRequest(this.requestId, updated);
      alert(`บันทึกการแก้ไขข้อมูลเรียบร้อย`);
    } else {
      // Create New
      const newReq: VehicleRequest = {
        id: this.requestId,
        createDate: new Date().toISOString().split('T')[0], // Today YYYY-MM-DD
        status: 'รอตรวจสอบ',
        items: requestItems
      };
      this.vehicleService.addRequest(newReq);
      alert(`สร้างรายการเบิกเลขที่ ${this.requestId} สำเร็จ\nยอดรวมทั้งสิ้น: ${this.totalAmount} บาท`);
    }

    this.closeModal();
  }

  closeModal() {
    this.onClose.emit();
  }
}

function matchTime(t: any): string {
  return t ? String(t) : '';
}
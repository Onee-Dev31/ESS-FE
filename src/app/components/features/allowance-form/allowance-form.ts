import { Component, OnInit, EventEmitter, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService, AllowanceRequest, AllowanceItem } from '../../../services/vehicle.service';

@Component({
  selector: 'app-allowance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './allowance-form.html',
  styleUrls: ['./allowance-form.scss']
})
export class AllowanceFormComponent implements OnInit {
  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  private vehicleService = inject(VehicleService);

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2568, 2569, 2570];
  selectedMonthIndex: number = 9;
  selectedYearBE: number = 2568;
  totalAmount: number = 0;
  totalHoursStr: string = '0.00';
  logs: any[] = [];

  ngOnInit(): void {
    if (!this.requestId) {
      this.requestId = this.vehicleService.generateNextAllowanceId();
    }
    const existing = this.vehicleService.getAllowanceRequestById(this.requestId);
    this.generateCalendar(existing);
  }

  generateCalendar(existing?: AllowanceRequest) {
    // In real app, pass month/year to service
    const rawData = this.vehicleService.getMockAllowanceLogs(this.selectedMonthIndex, this.selectedYearBE);

    this.logs = rawData.map(item => {
      // Find matching item in existing request
      const match = existing?.items.find(i => i.date === item.d); // Mock logs use 'd', service items use 'date'

      // If match found, use its values. Else use defaults from rawData
      // Note: rawData uses 'd', 't', 'in', 'out', 's', 'desc'
      // AllowanceItem uses 'date', 'dayType', 'timeIn', 'timeOut', 'description'

      const log = {
        date: item.d,
        dayType: item.t,
        timeIn: item.in,
        timeOut: item.out,
        displayHours: '0.00',
        actualExtraHours: 0,
        amount: 0,
        selected: item.s,
        description: item.desc
      };

      if (match) {
        log.timeIn = match.timeIn;
        log.timeOut = match.timeOut;
        log.amount = match.amount;
        log.selected = match.selected;
        log.description = match.description;
        // hours logic re-calc below
      }

      this.autoCalculate(log);
      // If match, ensure we use the saved amount/hours if possible, 
      // but autoCalculate should yield same result if inputs are same.

      return log;
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

    const [sh, sm] = log.timeIn.split(':').map(Number);
    const [eh, em] = log.timeOut.split(':').map(Number);

    let totalMins = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMins < 0) totalMins += 1440;

    let extraMins = totalMins - 540;
    if (extraMins < 0) extraMins = 0;


    const extraHoursDecimal = extraMins / 60;
    log.actualExtraHours = extraHoursDecimal;

    const h = Math.floor(extraMins / 60);
    const m = extraMins % 60;
    log.displayHours = `${h}.${m.toString().padStart(2, '0')}`;

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

  onToggleCheck(log: any) {
    this.autoCalculate(log);
  }

  updateTotal() {
    const selected = this.logs.filter(l => l.selected);

    this.totalAmount = selected.reduce((sum, c) => sum + (c.amount || 0), 0);

    let totalExtraMins = selected.reduce((sum, c) => sum + (c.actualExtraHours * 60), 0);
    const h = Math.floor(totalExtraMins / 60);
    const m = Math.round(totalExtraMins % 60);
    this.totalHoursStr = `${h}.${m.toString().padStart(2, '0')}`;
  }

  onSubmit() {
    const invalid = this.logs.filter(l => l.selected && (!l.description || l.description.trim() === ''));
    if (invalid.length > 0) {
      alert('กรุณากรอกรายละเอียดการเบิกให้ครบถ้วน');
      return;
    }

    // Convert to AllowanceItem[]
    const items: AllowanceItem[] = this.logs
      .filter(l => l.selected)
      .map(l => ({
        date: l.date,
        dayType: l.dayType,
        timeIn: l.timeIn,
        timeOut: l.timeOut,
        description: l.description,
        hours: parseFloat(l.displayHours), // approx
        amount: l.amount,
        selected: true
      }));

    if (items.length === 0) {
      alert('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
      return;
    }

    const existing = this.vehicleService.getAllowanceRequestById(this.requestId);
    if (existing) {
      this.vehicleService.updateAllowanceRequest(this.requestId, {
        ...existing,
        items: items
      });
      alert(`อัปเดตรายการ ${this.requestId} เรียบร้อย`);
    } else {
      const newReq: AllowanceRequest = {
        id: this.requestId,
        createDate: new Date().toISOString().split('T')[0], // yyyy-mm-dd
        status: 'รอตรวจสอบ',
        items: items
      };
      this.vehicleService.addAllowanceRequest(newReq);
      alert(`บันทึกสำเร็จ ยอดรวม ${this.totalAmount} บาท (รวม ${this.totalHoursStr} ชม.)`);
    }

    this.closeModal();
  }

  closeModal() {
    this.onClose.emit();
  }
}
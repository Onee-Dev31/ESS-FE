import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2568, 2569, 2570];
  selectedMonthIndex: number = 9; 
  selectedYearBE: number = 2568;
  totalAmount: number = 0;
  totalHoursStr: string = '0.00';
  logs: any[] = [];

  ngOnInit(): void {
    if (!this.requestId) {
      this.requestId = this.generateNextRequestId();
    }
    this.generateCalendar();
  }

  generateNextRequestId(): string {
    const now = new Date();
    const year = (now.getFullYear()).toString().slice(-2); // 27
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 01
    
    const prefix = `${year}${month}`;
    const nextNumber = '005'; 
    
    return `${prefix}-${nextNumber}`;
  }

  generateCalendar() {
    const rawData = [
      { d: '01/10/2025', t: 'W', in: '09:14', out: '20:00', s: true, desc: 'ถ่ายงานหลังรายการแฉ' },
      { d: '02/10/2025', t: 'W', in: '09:16', out: '23:00', s: true, desc: 'สแตนด์บายงาน' },
      { d: '03/10/2025', t: 'W', in: '09:34', out: '18:15', s: false, desc: '' },
      { d: '04/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '05/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '06/10/2025', t: 'W', in: '09:20', out: '18:10', s: false, desc: '' },
      { d: '07/10/2025', t: 'W', in: '09:15', out: '18:22', s: false, desc: '' },
      { d: '08/10/2025', t: 'W', in: '09:26', out: '18:22', s: false, desc: '' },
      { d: '09/10/2025', t: 'W', in: '09:22', out: '18:13', s: false, desc: '' },
      { d: '10/10/2025', t: 'W', in: '08:58', out: '18:14', s: false, desc: '' },
      { d: '11/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '12/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '13/10/2025', t: 'T', in: '', out: '', s: false, desc: '' },
      { d: '14/10/2025', t: 'W', in: '09:24', out: '18:39', s: false, desc: '' },
      { d: '15/10/2025', t: 'W', in: '09:12', out: '17:40', s: false, desc: '' },
      { d: '16/10/2025', t: 'W', in: '09:17', out: '18:27', s: false, desc: '' },
      { d: '17/10/2025', t: 'W', in: '11:19', out: '16:59', s: false, desc: '' },
      { d: '18/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '19/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '20/10/2025', t: 'W', in: '09:19', out: '15:55', s: false, desc: '' },
      { d: '21/10/2025', t: 'W', in: '09:17', out: '18:36', s: false, desc: '' },
      { d: '22/10/2025', t: 'W', in: '09:46', out: '18:05', s: false, desc: '' },
      { d: '23/10/2025', t: 'T', in: '', out: '', s: false, desc: '' },
      { d: '24/10/2025', t: 'L', in: '', out: '', s: false, desc: '' },
      { d: '25/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '26/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
      { d: '27/10/2025', t: 'W', in: '09:31', out: '18:15', s: true, desc: 'ทดสอบการเบิก' },
      { d: '28/10/2025', t: 'W', in: '09:52', out: '18:39', s: false, desc: '' },
      { d: '29/10/2025', t: 'W', in: '09:37', out: '18:13', s: false, desc: '' },
      { d: '30/10/2025', t: 'W', in: '09:44', out: '18:51', s: false, desc: '' },
      { d: '31/10/2025', t: 'W', in: '09:39', out: '18:09', s: false, desc: '' }
    ];

    this.logs = rawData.map(item => {
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
      this.autoCalculate(log);
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
    const invalid = this.logs.filter(l => l.selected && !l.description);
    if (invalid.length > 0) {
      alert('กรุณากรอกรายละเอียดการเบิกให้ครบถ้วน');
      return;
    }
    alert(`บันทึกสำเร็จ ยอดรวม ${this.totalAmount} บาท (รวม ${this.totalHoursStr} ชม.)`);
    this.closeModal();
  }

  closeModal() {
    this.onClose.emit();
  }
}
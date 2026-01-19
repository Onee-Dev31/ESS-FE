import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-form.html',
  styleUrls: ['./vehicle-form.scss']
})
export class VehicleFormComponent implements OnInit {
  // รับค่ามาจากหน้ารายการ (Vehicle Page)
  @Input() requestId: string = '';

  // ส่ง Event กลับไปเพื่อปิด Modal (ชื่อต้องตรงกับใน HTML ที่คุณส่งมาคือ onClose)
  @Output() onClose = new EventEmitter<void>();

  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2568, 2569, 2570];

  selectedMonthIndex: number = 9; 
  selectedYearBE: number = 2568;
  totalAmount: number = 0;
  logs: any[] = [];

  ngOnInit(): void {
    // หากไม่มี requestId ส่งมา ให้กำหนดเป็น 'ใหม่' หรือ Generate เบื้องต้น
    if (!this.requestId) {
      this.requestId = 'VHC-NEW-' + new Date().getTime().toString().slice(-4);
    }
    this.generateCalendar();
  }

  generateCalendar() {
    // ข้อมูล Mockup 31 วัน
    const mockupData = [
      { d: '01/10/2025', t: 'W', in: '09:14', out: '23:30', s: true, desc: 'แชร์ค่าแท็กซี่กลับบ้าน (เลิกงานดึก)' },
      { d: '02/10/2025', t: 'W', in: '05:30', out: '18:00', s: true, desc: 'เรียก Grab มาทำงาน (เข้างานเช้า)' },
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
      { d: '27/10/2025', t: 'W', in: '09:31', out: '22:15', s: true, desc: '' }, // แถวนี้จะติดขอบแดงเพราะ s: true แต่ไม่มี desc
      { d: '28/10/2025', t: 'W', in: '09:52', out: '18:39', s: false, desc: '' },
      { d: '29/10/2025', t: 'W', in: '09:37', out: '18:13', s: false, desc: '' },
      { d: '30/10/2025', t: 'W', in: '09:44', out: '18:51', s: false, desc: '' },
      { d: '31/10/2025', t: 'W', in: '09:39', out: '18:09', s: false, desc: '' }
    ];

    this.logs = mockupData.map(item => ({
      date: item.d,
      dayType: item.t,
      timeIn: item.in,
      timeOut: item.out,
      amount: 0,
      selected: item.s,
      description: item.desc
    }));

    // คำนวณเงินครั้งแรกสำหรับค่า Mockup
    this.logs.forEach(log => this.calculateVehicleAmount(log));
  }

  // คำนวณเงิน: ก่อน 06:00 หรือ หลัง 22:00
  calculateVehicleAmount(log: any) {
    if (!log.selected || !log.timeIn || !log.timeOut) {
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

  onToggleCheck(log: any) {
    this.calculateVehicleAmount(log);
  }

  updateTotal() {
    this.totalAmount = this.logs
      .filter(l => l.selected)
      .reduce((sum, current) => sum + current.amount, 0);
  }

  onSubmit() {
    // ตรวจสอบว่ามีแถวที่เลือกแต่ไม่ได้กรอกรายละเอียดหรือไม่
    const invalidLogs = this.logs.filter(l => l.selected && (!l.description || l.description.trim() === ''));
    
    if (invalidLogs.length > 0) {
      alert('กรุณากรอกรายละเอียดการเบิกให้ครบถ้วนในช่องที่ระบบแจ้งเตือน (ขอบแดง)');
      return;
    }

    if (this.totalAmount === 0) {
      alert('ไม่พบรายการที่เข้าเงื่อนไขการเบิกค่ารถ (ก่อน 06:00 หรือ หลัง 22:00)');
      return;
    }

    alert(`บันทึกข้อมูลการเบิกเลขที่ ${this.requestId} สำเร็จ\nยอดรวมทั้งสิ้น: ${this.totalAmount} บาท`);
    this.closeModal();
  }

  closeModal() {
    this.onClose.emit(); // แจ้ง Parent ให้ปิด Modal
  }
}
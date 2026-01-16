import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DailyLog {
  date: string;       
  rawDate: Date;      
  dayType: string;    
  timeIn: string;
  timeOut: string;
  selected: boolean;
  amount: number;
  description: string;
}

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-form.html',
  styleUrl: './vehicle-form.scss'
})
export class VehicleFormComponent implements OnInit {
  
  @Output() onClose = new EventEmitter<void>();

  selectedMonthIndex: number = 9; 
  selectedYearBE: number = 2568;
  thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน','กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  years = [2567, 2568, 2569];
  logs: DailyLog[] = [];

  ngOnInit() { this.generateCalendar(); }

  generateCalendar() {
    this.logs = [];
    const yearAD = this.selectedYearBE - 543;
    const daysInMonth = new Date(yearAD, this.selectedMonthIndex + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(yearAD, this.selectedMonthIndex, day);
      const dayOfWeek = currentDate.getDay(); 
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      this.logs.push({
        date: `${day.toString().padStart(2, '0')}/${(this.selectedMonthIndex + 1).toString().padStart(2, '0')}/${yearAD}`,
        rawDate: currentDate,
        dayType: isWeekend ? 'H' : 'W',
        timeIn: '', timeOut: '', selected: false, amount: 0, description: ''
      });
    }
  }

  /* --- รับค่าเฉพาะตัวเลขและโคลอนเท่านั้น --- */
  onTimeKeyPress(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    const charStr = String.fromCharCode(charCode);
    if (!/^[0-9:]+$/.test(charStr)) { 
        event.preventDefault(); 
    }
  }

  /* --- จัด Format เวลาอัตโนมัติ (0900 -> 09:00) --- */
  onTimeInputChange(log: DailyLog, field: 'timeIn' | 'timeOut') {
    let val = log[field].replace(/[^0-9]/g, ''); 
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 3) {
      log[field] = val.substring(0, 2) + ':' + val.substring(2);
    } else {
      log[field] = val;
    }
  }

  get totalAmount(): number { 
    return this.logs.filter(l => l.selected).reduce((sum, curr) => sum + 120, 0); 
  }

  onToggleCheck(log: DailyLog) { 
    if (!log.selected) { 
        log.amount = 0; log.description = ''; log.timeIn = ''; log.timeOut = ''; 
    } else { 
        log.amount = 120; 
    } 
  }

  closeModal() { this.onClose.emit(); }

  onSubmit() {
    const selectedItems = this.logs.filter(l => l.selected);
    if (selectedItems.length === 0) { alert('กรุณาเลือกรายการเบิก'); return; }
    console.log('Submitted:', selectedItems);
    this.closeModal();
  }
}
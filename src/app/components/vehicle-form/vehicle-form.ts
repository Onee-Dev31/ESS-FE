import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DailyLog {
  date: string;       
  rawDate: Date;      
  dayType: string;    
  timeIn: string;
  timeOut: string;
  selected: boolean;
  amount: number | null;
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
  @Input() requestId: string = '';

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
      
      let dayType = 'W';
      if (dayOfWeek === 0 || dayOfWeek === 6) dayType = 'H'; 
      if (day === 13 || day === 23) dayType = 'T'; 
      if (day === 24) dayType = 'L'; 

      let timeIn = '';
      let timeOut = '';
      if (dayType === 'W' && day < 15) {
          timeIn = `09:${Math.floor(Math.random() * 20 + 10)}`;
          timeOut = `18:${Math.floor(Math.random() * 20 + 10)}`;
      }

      this.logs.push({
        date: `${day.toString().padStart(2, '0')}/${(this.selectedMonthIndex + 1).toString().padStart(2, '0')}/${this.selectedYearBE}`,
        rawDate: currentDate,
        dayType: dayType,
        timeIn: timeIn,
        timeOut: timeOut,
        selected: day === 1 || day === 2 || day === 27,
        amount: (day === 1 || day === 2 || day === 27) ? 120 : null,
        description: day === 1 ? 'ถ่ายงานหลังรายการแจ' : (day === 2 ? 'สแตนด์บายงาน' : (day === 27 ? 'ทดสอบการเบิก' : ''))
      });
    }
  }

  onTimeKeyPress(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    const charStr = String.fromCharCode(charCode);
    if (!/^[0-9:]+$/.test(charStr)) event.preventDefault();
  }

  onTimeInputChange(log: DailyLog, field: 'timeIn' | 'timeOut') {
    let val = log[field].replace(/[^0-9]/g, ''); 
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 3) {
      log[field] = val.substring(0, 2) + ':' + val.substring(2);
    } else {
      log[field] = val;
    }
  }

  onToggleCheck(log: DailyLog) { 
    if (!log.selected) { 
        log.amount = null; log.description = ''; 
    } else { 
        log.amount = 120; 
    } 
  }

  get totalAmount(): number { 
    return this.logs.filter(l => l.selected).reduce((sum, curr) => sum + (curr.amount || 0), 0); 
  }

  closeModal() { this.onClose.emit(); }
  onSubmit() { console.log('Data:', this.logs.filter(l => l.selected)); this.closeModal(); }
}
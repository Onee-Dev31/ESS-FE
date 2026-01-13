import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconsModule } from '@ng-icons/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DayCellContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgIconsModule,
    FullCalendarModule,
  ],
  templateUrl: './dashboard.html', // ตรวจสอบชื่อไฟล์ให้ตรง (บางทีเป็น .component.html)
  styleUrl: './dashboard.scss',    // ตรวจสอบชื่อไฟล์ให้ตรง
  encapsulation: ViewEncapsulation.None // สำคัญมาก! ต้องมี
})
export class DashboardComponent {
  
  // ---------------------------------------------------------
  // 1. จำลองข้อมูล (Data)
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // 1. จำลองข้อมูล (Data) - รวมวันหยุดไทย ปี 2026
  // ---------------------------------------------------------
  specialDates: Record<string, any> = {

    // --- มกราคม ---
    '2026-01-01': { type: 'holiday', note: 'วันขึ้นปีใหม่', code: 'HOL' },

    // --- มีนาคม ---
    '2026-03-03': { type: 'holiday', note: 'วันมาฆบูชา', code: 'HOL' }, // (วันที่โดยประมาณ)

    // --- เมษายน (สงกรานต์) ---
    '2026-04-06': { type: 'holiday', note: 'วันจักรี', code: 'HOL' },
    '2026-04-13': { type: 'holiday', note: 'วันสงกรานต์', code: 'HOL' },
    '2026-04-14': { type: 'holiday', note: 'วันสงกรานต์', code: 'HOL' },
    '2026-04-15': { type: 'holiday', note: 'วันสงกรานต์', code: 'HOL' },

    // --- พฤษภาคม ---
    '2026-05-01': { type: 'holiday', note: 'วันแรงงาน', code: 'HOL' },
    '2026-05-04': { type: 'holiday', note: 'วันฉัตรมงคล', code: 'HOL' },
    '2026-05-31': { type: 'holiday', note: 'วันวิสาขบูชา', code: 'HOL' }, // (วันที่โดยประมาณ)

    // --- มิถุนายน ---
    '2026-06-03': { type: 'holiday', note: 'วันเฉลิมฯ ราชินี', code: 'HOL' },

    // --- กรกฎาคม ---
    '2026-07-28': { type: 'holiday', note: 'วันเฉลิมฯ ร.10', code: 'HOL' },
    '2026-07-29': { type: 'holiday', note: 'วันอาสาฬหบูชา', code: 'HOL' }, // (วันที่โดยประมาณ)
    '2026-07-30': { type: 'holiday', note: 'วันเข้าพรรษา', code: 'HOL' }, // (วันที่โดยประมาณ)

    // --- สิงหาคม ---
    '2026-08-12': { type: 'holiday', note: 'วันแม่แห่งชาติ', code: 'HOL' },

    // --- ตุลาคม ---
    '2026-10-13': { type: 'holiday', note: 'วันนวมินทรมหาราช', code: 'HOL' },
    '2026-10-23': { type: 'holiday', note: 'วันปิยมหาราช', code: 'HOL' },

    // --- ธันวาคม ---
    '2026-12-05': { type: 'holiday', note: 'วันพ่อแห่งชาติ', code: 'HOL' },
    '2026-12-10': { type: 'holiday', note: 'วันรัฐธรรมนูญ', code: 'HOL' },
    '2026-12-31': { type: 'holiday', note: 'วันสิ้นปี', code: 'HOL' },
    
    // --- ตัวอย่างวันลา (ใส่แทรกได้ปกติ) ---
    '2026-01-20': { type: 'leave', note: 'ลาพักร้อน', code: 'VAC' },
  };

  // ---------------------------------------------------------
  // 2. ตั้งค่าปฏิทิน (Config)
  // ---------------------------------------------------------
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next'
    },
    locale: 'th', // ภาษาไทย
    firstDay: 0,  // เริ่มวันอาทิตย์
    contentHeight: 'auto',
    fixedWeekCount: false,

    // Logic สร้าง HTML ในช่องวันที่
    dayCellContent: (arg: DayCellContentArg) => {
      // แปลงวันที่ให้ตรงกับ Key ใน Object (แก้เรื่อง Timezone)
      const offset = arg.date.getTimezoneOffset() * 60000;
      const localDate = new Date(arg.date.getTime() - offset);
      const dateStr = localDate.toISOString().split('T')[0]; // ได้ค่า 'YYYY-MM-DD'
      
      const dayNumber = arg.dayNumberText;
      const data = this.specialDates[dateStr]; // ดึงข้อมูลจาก Key
      
      // เช็คว่าเป็นวันเสาร์-อาทิตย์หรือไม่ (0=อาทิตย์, 6=เสาร์)
      const isWeekend = arg.date.getDay() === 0 || arg.date.getDay() === 6;

      let circleClass = '';
      let textClass = ''; // สีตัวหนังสือ
      let noteText = '';
      let codeText = '001'; // Default code

      // --- Logic การกำหนด Class สี ---
      if (data?.type === 'holiday') {
        // กรณี: วันหยุดนักขัตฤกษ์ (Priority สูงสุด)
        circleClass = 'circle-green-outline';
        textClass = 'text-green';
        noteText = data.note;
        codeText = data.code;

      } else if (data?.type === 'leave') {
        // กรณี: วันลา
        circleClass = 'circle-orange-outline';
        textClass = 'text-orange';
        noteText = data.note;
        codeText = data.code;

      } else if (isWeekend) {
        // กรณี: วันหยุดเสาร์-อาทิตย์
        circleClass = 'circle-red-outline';
        textClass = 'text-red';
        codeText = 'OFF';
      
      } else {
        // กรณี: วันทำงานปกติ
        codeText = '001';
        textClass = 'text-muted'; // สีเทาๆ
      }

      // --- Return HTML ---
      return {
        html: `
          <div class="date-cell-custom">
            <div class="date-circle ${circleClass}">${dayNumber}</div>
            
            <div class="date-code ${textClass}">${codeText}</div> 
            
            ${noteText ? `<div class="date-note ${textClass}">${noteText}</div>` : ''}
          </div>
        `
      };
    }
  };

  constructor(private router: Router) { }

  logout() {
    // localStorage.removeItem('token'); // ลบ Token จริง
    this.router.navigate(['/login']);
  }
}
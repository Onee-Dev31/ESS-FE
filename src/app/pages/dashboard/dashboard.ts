import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DayCellContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// Interfaces
interface ProfileItem { label: string; value: string; icon?: string; iconColor?: string; }
interface MedicalStat { label: string; subLabel: string; used: string; balance: string; balanceColor: string; progressColor: string; percent: number; }
interface WelfareItem { 
  title: string; 
  amount: string; 
  iconName: string; 
  cardClass?: string;
  titleColor?: string;
  amountColor?: string;
  tooltip?: string;
}
interface LeaveItem {
  label: string;
  count: string;
  countColor: string;
  iconClass: string;
  iconColor?: string; // <--- เพิ่มตรงนี้สำหรับส่วนการลา
  theme: string;
  balance: number;
}
interface HolidayItem { date: string; name: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule, 
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss', 
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent {

  // =========================================================
  // DATA SECTION
  // =========================================================

  // 1. Profile Data
  profileList: ProfileItem[] = [
    { label: 'Email', value: 'praewnapa.boo@onee.one', icon: 'fas fa-envelope', iconColor: '#ffffff' },
    { label: 'เบอร์โทรศัพท์', value: '9409', icon: 'fas fa-phone-alt', iconColor: '#ffffff' },
    { label: 'ชั้น', value: '15', icon: 'fas fa-layer-group', iconColor: '#ffffff' },
    { label: 'แผนก', value: '11206 - Program Development', icon: 'fas fa-sitemap', iconColor: '#ffffff' },
    { label: 'บริษัท', value: 'OTV-บริษัท วัน สามสิบเอ็ด จำกัด', icon: 'fas fa-building', iconColor: '#ffffff' }
  ];

  // 2. IT Story Data
  itList: ProfileItem[] = [
    { label: 'Account เข้าเครื่องคอม, Email, Wifi', value: 'praewnapaboo' },
    { label: 'Account expire date', value: '16-Jul-2026' },
    { label: 'Laptop', value: 'Dell 555 Asset No. 44545sf45dfd86' },
    { label: 'PC', value: 'Dell 888 Asset No. 415v489dfg7df/9' },
    { label: 'Monitor', value: 'Dell 999 Asset No. 415v489dfg7df/9' }
  ];

  // 3. Medical Stats
  medicalStats: MedicalStat[] = [
    { label: 'ผู้ป่วยนอก', subLabel: '(15,000/ปี)', used: '3,000', balance: '12,000', balanceColor: 'text-red', progressColor: 'bg-red', percent: 20 },
    { label: 'ทันตกรรม', subLabel: '(1,000/ปี)', used: '1,000', balance: '0', balanceColor: 'text-blue', progressColor: 'bg-blue', percent: 100 },
    { label: 'สายตา', subLabel: '(1,000/ปี)', used: '1,000', balance: '0', balanceColor: 'text-indigo', progressColor: 'bg-indigo', percent: 100 },
    { label: 'ผู้ป่วยใน', subLabel: '(40,000/ปี)', used: '3,000', balance: '37,000', balanceColor: 'text-green', progressColor: 'bg-green', percent: 7.5 },
  ];

  // 4. Welfare Data
  welfareStats: WelfareItem[] = [
    { 
      title: 'ค่าเบี้ยเลี้ยง', 
      amount: '10,500', 
      iconName: 'fas fa-dollar-sign', 
      cardClass: 'card-green',
      titleColor: '#15803d',
      amountColor: '#15803d'
    },
    { 
      title: 'ค่ารถ', 
      amount: '584', 
      iconName: 'fas fa-car', 
      cardClass: 'card-blue',
      tooltip: `<strong>เงื่อนไข:</strong><br />- ก่อน 06:00 น. หรือ หลัง 22:00 น.<br />- เบิกได้ไม่เกิน 120 บาท/ครั้ง`,
      titleColor: '#1e40af',
      amountColor: '#1e40af'
    },
    { 
      title: 'ค่าแท็กซี่', 
      amount: '876', 
      iconName: 'fas fa-taxi', 
      cardClass: 'card-yellow',
      tooltip: `<strong>เงื่อนไข:</strong><br />- วงเงิน 1,000 บาท / ปี<br />- เฉพาะเดินทางไป-กลับ สนง. เท่านั้น`,
      titleColor: '#9a3412',
      amountColor: '#9a3412'
    },
    { 
      title: 'ค่าสมรส', 
      amount: '3,500', 
      iconName: 'fas fa-heart', 
      tooltip: `<strong>เงื่อนไข:</strong><br />- อายุงานครบ 1 ปี<br />- เบิกได้ 5,000 บาท 1 ครั้ง`
    },
    { 
      title: 'ค่าอุปสมบท', 
      amount: '10,500', 
      iconName: 'fas fa-hands-praying', 
      tooltip: `<strong>เงื่อนไข:</strong><br />- อายุงาน 1 ปี เพศชาย<br />- เบิกได้ 5,000 บาท 1 ครั้ง`
    },
    { 
      title: 'ค่าฌาปนกิจ', 
      amount: '584', 
      iconName: 'fas fa-church', 
      tooltip: `<strong>เงื่อนไข :</strong><br />- เบิกได้ 80,000 บาท/ตลอดอายุงาน`
    },
    { 
      title: 'ค่าพวงหรีด', 
      amount: '876', 
      iconName: 'fas fa-spa', 
      tooltip: `<strong>เงื่อนไข :</strong><br />- เบิกได้ 12,000 บาท/ตลอดอายุงาน`
    }
  ];

  // 5. Leave Stats
  leaveStats: LeaveItem[] = [
    { 
      label: 'ลาพักร้อน', 
      count: '01/09', 
      countColor: '#dc3545', 
      iconClass: 'fas fa-plane-departure', 
      iconColor: '#ef4444', 
      theme: 'theme-pink', 
      balance: 8 
    },
    { 
      label: 'ลากิจ', 
      count: '03/06', 
      countColor: '#0d6efd', 
      iconClass: 'fas fa-briefcase', 
      iconColor: '#3b82f6',
      theme: 'theme-blue', 
      balance: 3 
    },
    { 
      label: 'ลาป่วย', 
      count: '10/30', 
      countColor: '#4650dd', 
      iconClass: 'fas fa-stethoscope', 
      iconColor: '#4049c7',
      theme: 'theme-purple', 
      balance: 20 
    },
    { 
      label: 'ลาเพื่อประกอบพิธีสมรส', 
      count: '0/5', 
      countColor: '#35b653', 
      iconClass: 'fas fa-ring', 
      iconColor: '#35b653',
      theme: 'theme-green', 
      balance: 5 
    },
    { 
      label: 'ลาคลอด', 
      count: '01/09', 
      countColor: '#dc3545', 
      iconClass: 'fas fa-baby-carriage', 
      iconColor: '#ef4444',
      theme: 'theme-pink', 
      balance: 8 
    },
    { 
      label: 'ลาต่อเนื่องจากลาคลอด (บุตรเจ็บป่วย)', 
      count: '03/06', 
      countColor: '#0d6efd', 
      iconClass: 'fas fa-hand-holding-heart', 
      iconColor: '#3b82f6', 
      theme: 'theme-blue', 
      balance: 3 
    },
    { 
      label: 'ลาทำหมัน', 
      count: '03/06', 
      countColor: '#4650dd', 
      iconClass: 'fas fa-user-md', 
      iconColor: '#4049c7',
      theme: 'theme-purple', 
      balance: 3 
    },
    { 
      label: 'ลาเพื่อจัดการงานศพ', 
      count: '03/06', 
      countColor: '#35b653', 
      iconClass: 'fas fa-ribbon', 
      iconColor: '#35b653',
      theme: 'theme-green', 
      balance: 3 
    },
    { 
      label: 'ลาป่วยเกิน 30 วัน', 
      count: '03/06', 
      countColor: '#dc3545', 
      iconClass: 'fas fa-procedures', 
      iconColor: '#ef4444',
      theme: 'theme-pink', 
      balance: 3 
    },
  ];

  // 6. Holidays
  holidays: HolidayItem[] = [
    { date: '05/12/2569', name: 'วันคล้ายวันพระบรมราชสมภพ...' },
    { date: '10/12/2569', name: 'วันรัฐธรรมนูญ' },
    { date: '31/12/2569', name: 'วันสิ้นปี' }
  ];

  // =========================================================
  // CALENDAR LOGIC
  // =========================================================

  specialDates: Record<string, any> = {
    '2026-01-01': { type: 'holiday', note: 'วันขึ้นปีใหม่', code: 'HOL' },
    '2026-03-03': { type: 'holiday', note: 'วันมาฆบูชา', code: 'HOL' }, 
    '2026-04-06': { type: 'holiday', note: 'วันจักรี', code: 'HOL' },
    '2026-04-13': { type: 'holiday', note: 'วันสงกรานต์', code: 'HOL' },
    '2026-04-14': { type: 'holiday', note: 'วันสงกรานต์', code: 'HOL' },
    '2026-04-15': { type: 'holiday', note: 'วันสงกรานต์', code: 'HOL' },
    '2026-05-01': { type: 'holiday', note: 'วันแรงงาน', code: 'HOL' },
    '2026-05-04': { type: 'holiday', note: 'วันฉัตรมงคล', code: 'HOL' },
    '2026-05-31': { type: 'holiday', note: 'วันวิสาขบูชา', code: 'HOL' },
    '2026-06-03': { type: 'holiday', note: 'วันเฉลิมฯ ราชินี', code: 'HOL' },
    '2026-07-28': { type: 'holiday', note: 'วันเฉลิมฯ ร.10', code: 'HOL' },
    '2026-07-29': { type: 'holiday', note: 'วันอาสาฬหบูชา', code: 'HOL' },
    '2026-07-30': { type: 'holiday', note: 'วันเข้าพรรษา', code: 'HOL' },
    '2026-08-12': { type: 'holiday', note: 'วันแม่แห่งชาติ', code: 'HOL' },
    '2026-10-13': { type: 'holiday', note: 'วันนวมินทรมหาราช', code: 'HOL' },
    '2026-10-23': { type: 'holiday', note: 'วันปิยมหาราช', code: 'HOL' },
    '2026-12-05': { type: 'holiday', note: 'วันพ่อแห่งชาติ', code: 'HOL' },
    '2026-12-10': { type: 'holiday', note: 'วันรัฐธรรมนูญ', code: 'HOL' },
    '2026-12-31': { type: 'holiday', note: 'วันสิ้นปี', code: 'HOL' },
    '2026-01-20': { type: 'leave', note: 'ลาพักร้อน', code: 'VAC' },
  };

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next'
    },
    locale: 'th',
    firstDay: 0,
    contentHeight: 'auto',
    fixedWeekCount: false,
    dayCellContent: (arg: DayCellContentArg) => {
      const offset = arg.date.getTimezoneOffset() * 60000;
      const localDate = new Date(arg.date.getTime() - offset);
      const dateStr = localDate.toISOString().split('T')[0];
      const dayNumber = arg.dayNumberText;
      const data = this.specialDates[dateStr];
      const isWeekend = arg.date.getDay() === 0 || arg.date.getDay() === 6;

      let circleClass = '';
      let textClass = '';
      let noteText = '';
      let codeText = '001';

      if (data?.type === 'holiday') {
        circleClass = 'circle-green-outline';
        textClass = 'text-green';
        noteText = data.note;
        codeText = data.code;
      } else if (data?.type === 'leave') {
        circleClass = 'circle-orange-outline';
        textClass = 'text-orange';
        noteText = data.note;
        codeText = data.code;
      } else if (isWeekend) {
        circleClass = 'circle-red-outline';
        textClass = 'text-red';
        codeText = 'OFF';
      } else {
        codeText = '001';
        textClass = 'text-muted';
      }

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
    this.router.navigate(['/login']);
  }
}
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DayCellContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { UserService, UserProfile } from '../../services/user.service';
import { DashboardService, MedicalStat, WelfareItem, LeaveItem, HolidayItem } from '../../services/dashboard.service';
import { VehicleService } from '../../services/vehicle.service';

interface ProfileItem { label: string; value: string; icon?: string; iconColor?: string; }

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
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private userService = inject(UserService);
  private dashboardService = inject(DashboardService);
  private vehicleService = inject(VehicleService);

  // Observables for Async Data
  userProfile$!: Observable<UserProfile>;
  medicalStats$!: Observable<MedicalStat[]>;
  welfareStats$!: Observable<WelfareItem[]>;
  leaveStats$!: Observable<LeaveItem[]>;
  holidays$!: Observable<HolidayItem[]>;
  pendingCount$!: Observable<number>;   

  // ข้อมูลจำลอง (Static)
  profileList: ProfileItem[] = [];
  itList: ProfileItem[] = [];

  attendanceList = [
    { label: 'ลาป่วย', value: '10 วัน' },
    { label: 'ลาพักร้อน', value: '5 วัน' },
    { label: 'ลากิจ', value: '5 วัน' },
    { label: 'มาสาย', value: '5 ครั้ง' },
    { label: 'ขาดงาน', value: '5 ครั้ง' }
  ];

  performanceList = [
    { year: 'ปี 2026', grade: 'เกรด A+' },
    { year: 'ปี 2025', grade: 'เกรด A' },
    { year: 'ปี 2024', grade: 'เกรด B+' },
    { year: 'ปี 2023', grade: 'เกรด B' },
    { year: 'ปี 2022', grade: 'เกรด C+' },
    { year: 'ปี 2021', grade: 'เกรด C' }
  ];

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

  constructor() { }

  ngOnInit() {
    this.userProfile$ = this.userService.getUserProfile();
    this.medicalStats$ = this.dashboardService.getMedicalStats();
    this.welfareStats$ = this.dashboardService.getWelfareStats();
    this.leaveStats$ = this.dashboardService.getLeaveStats();
    this.holidays$ = this.dashboardService.getHolidays();

    // คำนวณยอดรออนุมัติทั้งหมด
    this.pendingCount$ = this.vehicleService.getGlobalPendingCount();

    // แปลงข้อมูล Profile ให้แสดงผลได้ง่ายขึ้น
    this.userProfile$.subscribe(profile => {
      this.profileList = [
        { label: 'Email', value: profile.email, icon: 'fas fa-envelope', iconColor: '#ffffff' },
        { label: 'เบอร์โทรศัพท์', value: profile.phone, icon: 'fas fa-phone-alt', iconColor: '#ffffff' },
        { label: 'ชั้น', value: profile.floor, icon: 'fas fa-layer-group', iconColor: '#ffffff' },
        { label: 'แผนก', value: profile.department, icon: 'fas fa-sitemap', iconColor: '#ffffff' },
        { label: 'บริษัท', value: profile.company, icon: 'fas fa-building', iconColor: '#ffffff' }
      ];

      if (profile.itAssets) {
        this.itList = [
          { label: 'Account เข้าเครื่องคอม, Email, Wifi', value: profile.itAssets.account },
          { label: 'Account expire date', value: profile.itAssets.expireDate },
          { label: 'Laptop', value: profile.itAssets.laptop },
          { label: 'PC', value: profile.itAssets.pc },
          { label: 'Monitor', value: profile.itAssets.monitor }
        ];
      }
    });

    // หมายเหตุ: ข้อมูลวันหยุดปัจจุบันยังเป็น Hardcoded
  }

  navigateTo(path: string | undefined) {
    if (path) {
      this.router.navigate([path]);
    }
  }

  logout() {
    this.router.navigate(['/login']);
  }
}
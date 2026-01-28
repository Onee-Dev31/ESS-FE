import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DayCellContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Observable, map } from 'rxjs';

import { UserService, UserProfile } from '../../services/user.service';
import { DashboardService } from '../../services/dashboard.service';
import { MedicalStat, WelfareItem, LeaveItem, HolidayItem } from '../../interfaces/dashboard.interface';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';

interface ProfileItem { label: string; value: string; icon?: string; iconColor?: string; }
interface AttendanceItem { label: string; value: string; }
interface PerformanceItem { year: string; grade: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule,
    MedicalPolicyModalComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private userService = inject(UserService);
  private dashboardService = inject(DashboardService);

  isPolicyModalOpen = signal<boolean>(false);
  isTooltipModalOpen = signal<boolean>(false);
  tooltipModalContent = signal<string>('');

  userProfile$!: Observable<UserProfile>;
  medicalStats$!: Observable<MedicalStat[]>;
  welfareStats$!: Observable<WelfareItem[]>;
  leaveStats$!: Observable<LeaveItem[]>;
  holidays$!: Observable<HolidayItem[]>;
  pendingCount$!: Observable<number>;

  profileList$!: Observable<ProfileItem[]>;
  itList$!: Observable<ProfileItem[]>;

  attendanceList: AttendanceItem[] = [];
  performanceList: PerformanceItem[] = [];
  specialDates: Record<string, any> = {};

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
    // การตั้งค่าปฏิทิน (FullCalendar): ภาษาไทย, แสดงวันหยุด และวันลา
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


  ngOnInit() {
    this.userProfile$ = this.userService.getUserProfile();
    this.medicalStats$ = this.dashboardService.getMedicalStats();
    this.welfareStats$ = this.dashboardService.getWelfareStats();
    this.leaveStats$ = this.dashboardService.getLeaveStats();
    this.holidays$ = this.dashboardService.getHolidays();
    this.pendingCount$ = this.dashboardService.getGlobalPendingCount();

    // Fetch static data
    this.attendanceList = this.dashboardService.getAttendanceList();
    this.performanceList = this.dashboardService.getPerformanceList();
    this.specialDates = this.dashboardService.getSpecialDates();

    // แปลงข้อมูลโปรไฟล์สำหรับการแสดงผลในรายการ
    this.profileList$ = this.userProfile$.pipe(
      map(profile => [
        { label: 'Email', value: profile.email, icon: 'fas fa-envelope', iconColor: '#ffffff' },
        { label: 'เบอร์โทรศัพท์', value: profile.phone, icon: 'fas fa-phone-alt', iconColor: '#ffffff' },
        { label: 'ชั้น', value: profile.floor, icon: 'fas fa-layer-group', iconColor: '#ffffff' },
        { label: 'แผนก', value: profile.department, icon: 'fas fa-sitemap', iconColor: '#ffffff' },
        { label: 'บริษัท', value: profile.company, icon: 'fas fa-building', iconColor: '#ffffff' }
      ])
    );

    // แปลงข้อมูลทรัพย์สิน IT สำหรับการแสดงผลในรายการ
    this.itList$ = this.userProfile$.pipe(
      map(profile => {
        if (!profile.itAssets) return [];
        return [
          { label: 'Account เข้าเครื่องคอม, Email, Wifi', value: profile.itAssets.account },
          { label: 'Account expire date', value: profile.itAssets.expireDate },
          { label: 'Laptop', value: profile.itAssets.laptop },
          { label: 'PC', value: profile.itAssets.pc },
          { label: 'Monitor', value: profile.itAssets.monitor }
        ];
      })
    );
  }

  // เปิด Tooltip เป็น Modal
  openTooltip(content: string) {
    this.tooltipModalContent.set(content);
    this.isTooltipModalOpen.set(true);
  }

  closeTooltip() {
    this.isTooltipModalOpen.set(false);
    this.tooltipModalContent.set('');
  }

  // นำทางไปยังหน้าต่างๆ
  navigateTo(path: string | undefined) {
    if (path) {
      this.router.navigate([path]);
    }
  }
}

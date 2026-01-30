import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DayCellContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { UserService, UserProfile } from '../../services/user.service';
import { DashboardService } from '../../services/dashboard.service';
import { MedicalStat, WelfareItem, LeaveItem, HolidayItem } from '../../interfaces/dashboard.interface';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { TimeOffForm } from '../../components/features/time-off-form/time-off-form';
import { AuthService } from '../../services/auth.service';

import dayjs from 'dayjs';
import 'dayjs/locale/th';

interface ProfileItem { label: string; value: string; icon?: string; iconColor?: string; }
interface AttendanceItem { label: string; value: string; }
interface PerformanceItem { year: string; grade: string; }

// ตั้งค่า Locale เป็นไทยทั่วทั้ง Component
dayjs.locale('th');

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule,
    MedicalPolicyModalComponent,
    TimeOffForm
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private userService = inject(UserService);
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  // Reactive role from signal
  userRole = this.authService.userRole;

  isPolicyModalOpen = signal<boolean>(false);
  isTimeOffModalOpen = signal<boolean>(false);
  isTooltipModalOpen = signal<boolean>(false);
  tooltipModalContent = signal<string>('');
  selectedLeaveTypeId = signal<string>('');

  // Data Signals using toSignal
  userProfile = toSignal(this.userService.getUserProfile());
  medicalStats = toSignal(this.dashboardService.getMedicalStats(), { initialValue: [] });
  welfareStats = toSignal(this.dashboardService.getWelfareStats(), { initialValue: [] });
  leaveStats = toSignal(this.dashboardService.getLeaveStats(), { initialValue: [] });
  holidays = toSignal(this.dashboardService.getHolidays(), { initialValue: [] });
  pendingCount = toSignal(this.dashboardService.getGlobalPendingCount(), { initialValue: 0 });
  medicalPendingCount = toSignal(this.dashboardService.getMedicalPendingCount(), { initialValue: 0 });

  // Computed lists derived from userProfile signal
  profileList = computed<ProfileItem[]>(() => {
    const profile = this.userProfile();
    if (!profile) return [];
    return [
      { label: 'Email', value: profile.email, icon: 'fas fa-envelope', iconColor: '#ffffff' },
      { label: 'เบอร์โทรศัพท์', value: profile.phone, icon: 'fas fa-phone-alt', iconColor: '#ffffff' },
      { label: 'ชั้น', value: profile.floor, icon: 'fas fa-layer-group', iconColor: '#ffffff' },
      { label: 'แผนก', value: profile.department, icon: 'fas fa-sitemap', iconColor: '#ffffff' },
      { label: 'บริษัท', value: profile.company, icon: 'fas fa-building', iconColor: '#ffffff' }
    ];
  });

  itList = computed<ProfileItem[]>(() => {
    const profile = this.userProfile();
    if (!profile?.itAssets) return [];
    return [
      { label: 'Account เข้าเครื่องคอม, Email, Wifi', value: profile.itAssets.account },
      { label: 'Account expire date', value: profile.itAssets.expireDate },
      { label: 'Laptop', value: profile.itAssets.laptop },
      { label: 'PC', value: profile.itAssets.pc },
      { label: 'Monitor', value: profile.itAssets.monitor }
    ];
  });

  attendanceList: AttendanceItem[] = [];
  performanceList: PerformanceItem[] = [];
  specialDates: Record<string, { type: string; note?: string; code?: string }> = {};

  // --- Day.js Dynamic Props ---
  workStartDate = '2021-07-10';

  // ช่วงวันที่ของเดือนปัจจุบันแบบอัตโนมัติ
  attendancePeriod = computed(() => {
    const start = dayjs().startOf('month').format('DD/MM/YYYY');
    const end = dayjs().endOf('month').format('DD/MM/YYYY');
    return `${start} - ${end}`;
  });

  // อายุงานคำนวณอัตโนมัติ
  workDuration = computed(() => {
    const years = dayjs().diff(dayjs(this.workStartDate), 'year');
    return `${years} ปี`;
  });
  // ---------------------------

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
      const dateStr = dayjs(arg.date).format('YYYY-MM-DD');
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
        noteText = data.note || '';
        codeText = data.code || '001';
      } else if (data?.type === 'leave') {
        circleClass = 'circle-orange-outline';
        textClass = 'text-orange';
        noteText = data.note || '';
        codeText = data.code || '001';
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
    this.attendanceList = this.dashboardService.getAttendanceList();
    this.performanceList = this.dashboardService.getPerformanceList();
    this.specialDates = this.dashboardService.getSpecialDates();
  }

  openTimeOffForm(leaveLabel: string) {
    const mapping: Record<string, string> = {
      'ลาพักร้อน': 'vacation',
      'ลากิจ': 'personal',
      'ลาป่วย': 'sick',
      'ลาทำหมัน': 'sterilization',
      'ลาเพื่อจัดการงานศพ': 'funeral'
    };

    const typeId = mapping[leaveLabel] || '';
    this.selectedLeaveTypeId.set(typeId);
    this.isTimeOffModalOpen.set(true);
  }

  closeTimeOffForm() {
    this.isTimeOffModalOpen.set(false);
    this.selectedLeaveTypeId.set('');
  }

  openTooltip(content: string) {
    this.tooltipModalContent.set(content);
    this.isTooltipModalOpen.set(true);
  }

  closeTooltip() {
    this.isTooltipModalOpen.set(false);
    this.tooltipModalContent.set('');
  }

  navigateTo(path: string | undefined) {
    if (path) {
      this.router.navigate([path]);
    }
  }

  clearStorage() {
    if (confirm('คุณต้องการล้างข้อมูลทั้งหมดเพื่อให้ระบบเริ่มใหม่หรือไม่?')) {
      localStorage.clear();
      window.location.reload();
    }
  }
}

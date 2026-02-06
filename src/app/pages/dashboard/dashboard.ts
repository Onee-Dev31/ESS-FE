/**
 * @file Dashboard
 * @description Logic for Dashboard
 */

// Section: Imports
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
import { DialogService } from '../../services/dialog';
import { MedicalStat, WelfareItem, LeaveItem, HolidayItem } from '../../interfaces/dashboard.interface';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { TooltipModalComponent } from '../../components/modals/tooltip-modal/tooltip-modal';
import { TimeOffForm } from '../../components/features/time-off-form/time-off-form';
import { AuthService } from '../../services/auth.service';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';

import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { BUSINESS_CONFIG } from '../../constants/business.constant';

interface ProfileItem { label: string; value: string; icon?: string; iconColor?: string; }
interface AttendanceItem { label: string; value: string; }
interface PerformanceItem { year: string; grade: string; }

dayjs.locale('th');

// Section: Logic
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SkeletonComponent,
    CommonModule,
    FullCalendarModule,
    MedicalPolicyModalComponent,
    TooltipModalComponent,
    TimeOffForm
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private userService = inject(UserService);
  private dashboardService = inject(DashboardService);
  private dialogService = inject(DialogService);
  private authService = inject(AuthService);

  userRole = this.authService.userRole;

  isPolicyModalOpen = signal<boolean>(false);
  isTimeOffModalOpen = signal<boolean>(false);
  isTooltipModalOpen = signal<boolean>(false);
  tooltipModalContent = signal<string>('');
  selectedLeaveTypeId = signal<string>('');

  userProfile = toSignal(this.userService.getUserProfile());
  medicalStats = toSignal(this.dashboardService.getMedicalStats());
  welfareStats = toSignal(this.dashboardService.getWelfareStats());
  leaveStats = toSignal(this.dashboardService.getLeaveStats());
  holidays = toSignal(this.dashboardService.getHolidays());
  pendingCount = toSignal(this.dashboardService.getGlobalPendingCount(), { initialValue: 0 });
  medicalPendingCount = toSignal(this.dashboardService.getMedicalPendingCount(), { initialValue: 0 });

  // UI Mappers
  medicalStatsDisplay = computed(() => {
    const stats = this.medicalStats();
    if (!stats) return null;
    return stats.map(stat => {
      let balanceColor = 'text-balance';
      let progressColor = 'bg-primary';

      switch (stat.type) {
        case 'outpatient': progressColor = 'bg-red'; break;
        case 'dental': progressColor = 'bg-blue'; break;
        case 'optical': progressColor = 'bg-indigo'; break;
        case 'inpatient': progressColor = 'bg-green'; break;
      }

      return { ...stat, balanceColor, progressColor };
    });
  });

  welfareStatsDisplay = computed(() => {
    const stats = this.welfareStats();
    if (!stats) return null;
    return stats.map(item => {
      let iconName = 'fas fa-star';
      let cardClass = '';
      let titleColor = '';
      let amountColor = '';

      switch (item.id) {
        case 'allowance':
          iconName = 'fas fa-dollar-sign';
          cardClass = 'card-green';
          titleColor = '#15803d';
          amountColor = '#15803d';
          break;
        case 'transport':
          iconName = 'fas fa-car';
          cardClass = 'card-blue';
          titleColor = '#1e40af';
          amountColor = '#1e40af';
          break;
        case 'taxi':
          iconName = 'fas fa-taxi';
          cardClass = 'card-yellow';
          titleColor = '#9a3412';
          amountColor = '#9a3412';
          break;
        case 'wedding': iconName = 'fas fa-heart'; break;
        case 'ordination': iconName = 'fas fa-hands-praying'; break;
        case 'funeral': iconName = 'fas fa-church'; break;
        case 'wreath': iconName = 'fas fa-spa'; break;
      }
      return { ...item, iconName, cardClass, titleColor, amountColor };
    });
  });

  leaveStatsDisplay = computed(() => {
    const stats = this.leaveStats();
    if (!stats) return null;
    return stats.map(leave => {
      let countColor = '#4650dd';
      let iconClass = 'fas fa-file';
      let iconColor = '#888';
      let theme = 'theme-purple';

      switch (leave.type) {
        case 'vacation':
          countColor = '#dc3545';
          iconClass = 'fas fa-plane-departure';
          iconColor = '#ef4444';
          theme = 'theme-pink';
          break;
        case 'business':
          countColor = '#0d6efd';
          iconClass = 'fas fa-briefcase';
          iconColor = '#3b82f6';
          theme = 'theme-blue';
          break;
        case 'sick':
          countColor = '#4650dd';
          iconClass = 'fas fa-stethoscope';
          iconColor = '#4049c7';
          theme = 'theme-purple';
          break;
        case 'sterilization':
          countColor = '#4650dd';
          iconClass = 'fas fa-user-md';
          iconColor = '#9333ea';
          theme = 'theme-purple';
          break;
        case 'funeral':
          countColor = '#35b653';
          iconClass = 'fas fa-ribbon';
          iconColor = '#35b653';
          theme = 'theme-green';
          break;
      }

      return { ...leave, countColor, iconClass, iconColor, theme };
    });
  });

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

  workStartDate = BUSINESS_CONFIG.EMPLOYEE_START_DATE;

  attendancePeriod = computed(() => {
    const start = dayjs().startOf('month').format('DD/MM/YYYY');
    const end = dayjs().endOf('month').format('DD/MM/YYYY');
    return `${start} - ${end}`;
  });

  workDuration = computed(() => {
    const years = dayjs().diff(dayjs(this.workStartDate), 'year');
    return `${years} ปี`;
  });

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
        codeText = BUSINESS_CONFIG.DEFAULT_WORK_CODE;
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
    const mapping = BUSINESS_CONFIG.LEAVE_TYPE_MAP;

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

  async clearStorage() {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการล้างข้อมูล',
      message: 'คุณต้องการล้างข้อมูลทั้งหมดเพื่อให้ระบบเริ่มใหม่หรือไม่?',
      type: 'danger',
      confirmText: 'ล้างข้อมูล'
    });

    if (confirmed) {
      localStorage.clear();
      window.location.reload();
    }
  }
}

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DayCellContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';

import { UserService, UserProfile } from '../../services/user.service';
import { DashboardService } from '../../services/dashboard.service';
import { DialogService } from '../../services/dialog';
import { AllowanceApiService } from '../../services/allowance-api.service';
import { VehicleService } from '../../services/vehicle.service';
import { WelfareService, WelfareEventType } from '../../services/welfare.service';
import { MedicalStat, LeaveItem, HolidayItem } from '../../interfaces/dashboard.interface';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { TooltipModalComponent } from '../../components/modals/tooltip-modal/tooltip-modal';
import { TimeOffForm } from '../../components/features/time-off-form/time-off-form';
import { AuthService } from '../../services/auth.service';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';

import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { BUSINESS_CONFIG } from '../../constants/business.constant';
import { TeamCalendarService } from '../../services/team-calendar.service';
import { forkJoin } from 'rxjs';
import { NgZone } from '@angular/core';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import Swal from 'sweetalert2';
import { color } from 'echarts';

interface ProfileItem { label: string; value: string; icon?: string; iconColor?: string; }
interface AttendanceItem { label: string; value: string; }
interface PerformanceItem { year: string; grade: string; }

dayjs.locale('th');

/** หน้าแดชบอร์ดหลักสำหรับแสดงข้อมูลภาพรวม สถิติ และปฏิทินของพนักงาน */
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
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private userService = inject(UserService);
  private dashboardService = inject(DashboardService);
  private dialogService = inject(DialogService);
  private allowanceApiService = inject(AllowanceApiService);
  private vehicleService = inject(VehicleService);
  private welfareService = inject(WelfareService);
  authService = inject(AuthService);

  constructor(
    private teamCalendarService: TeamCalendarService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,

  ) {
  }

  userRole = this.authService.userRole;

  isPolicyModalOpen = signal<boolean>(false);
  isTimeOffModalOpen = signal<boolean>(false);
  isTooltipModalOpen = signal<boolean>(false);
  tooltipModalId = signal<string>('');
  selectedLeaveTypeId = signal<string>('');

  userProfile = toSignal(this.userService.getUserProfile());
  medicalStats = toSignal(this.dashboardService.getMedicalStats());

  leaveStats = toSignal(this.dashboardService.getLeaveStats());
  pendingCount = toSignal(this.dashboardService.getGlobalPendingCount(), { initialValue: 0 });
  medicalPendingCount = toSignal(this.dashboardService.getMedicalPendingCount(), { initialValue: 0 });

  /** แปลงข้อมูลสถิติการเบิกค่ารักษาพยาบาลเพื่อใช้ในการแสดงผล (ProgressBar และสี) */
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

  /** ฟอร์แมตข้อมูลสถิติการลา (สี, ไอคอน, ธีม) ตามประเภทการลา */
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
    const user = this.authService.userData();
    if (!user) return [];
    return [
      { label: 'Email', value: user.AD_USER || '-', icon: 'fas fa-envelope', iconColor: '#ffffff' },
      { label: 'เบอร์โทรศัพท์', value: user.USR_MOBILE || '-', icon: 'fas fa-phone-alt', iconColor: '#ffffff' },
      { label: 'แผนก', value: user.DEPARTMENT || '-', icon: 'fas fa-sitemap', iconColor: '#ffffff' },
      { label: 'บริษัท', value: user.COMPANY_NAME || '-', icon: 'fas fa-building', iconColor: '#ffffff' }
    ];
  });

  /** อุปกรณ์ IT ที่พนักงานครอบครอง (MOCK DATA) */
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
  allHolidays: Array<{ id: any; date: string; name: string }> = [];
  holidays: Array<{ id: any; date: string; name: string }> = [];
  holidayMap: Record<string, { id: any; name: string; year?: string }> = {};
  holidayColor: any;
  isFormOpen = signal(false);
  selectedDate = signal<string>('');
  profileLightbox = signal<{ url: string; name: string } | null>(null);

  openProfileLightbox() {
    const user = this.authService.userData();
    if (!user?.CODEMPID) return;
    this.profileLightbox.set({
      url: `https://empimg.oneeclick.co:8048/employeeimage/${user.CODEMPID}.jpg`,
      name: `${user.USR_FNAME ?? ''} ${user.USR_LNAME ?? ''}`.trim()
    });
  }

  closeProfileLightbox() { this.profileLightbox.set(null); }
  selectedRequestStatus = signal<string>('');
  allowanceTotalAmount = signal<number | null>(null);
  vehicleTotalAmount = signal<number | null>(null);
  welfareEventTypes = signal<WelfareEventType[]>([]);

  private readonly WELFARE_META: Record<string, { icon: string; colorClass?: string; tooltip?: string }> = {
    MARRIAGE:         { icon: 'fas fa-heart',          tooltip: 'wedding' },
    ORDINATION:       { icon: 'fas fa-hands-praying',   tooltip: 'ordination' },
    FUNERAL_EMPLOYEE: { icon: 'fas fa-church',          tooltip: 'funeral' },
    FUNERAL_FAMILY:   { icon: 'fas fa-church',          tooltip: 'funeral' },
    WREATH_EMPLOYEE:  { icon: 'fas fa-spa',             tooltip: 'wreath' },
    WREATH_FAMILY:    { icon: 'fas fa-spa',             tooltip: 'wreath' },
  };

  welfareStats = computed(() => {
    const allowanceAmt = this.allowanceTotalAmount();
    const allowanceValue = allowanceAmt === null ? '...' : allowanceAmt.toLocaleString('th-TH');
    const vehicleAmt = this.vehicleTotalAmount();
    const vehicleValue = vehicleAmt === null ? '...' : vehicleAmt.toLocaleString('th-TH');

    const fixed = [
      { label: 'ค่าเบี้ยเลี้ยง', value: allowanceValue, icon: 'fas fa-dollar-sign', colorClass: 'card-green', path: '/allowance' },
      { label: 'ค่ารถ', value: vehicleValue, icon: 'fas fa-car', colorClass: 'card-blue', path: '/vehicle', tooltip: 'transport' },
      { label: 'ค่าแท็กซี่', value: '...', icon: 'fas fa-taxi', colorClass: 'card-yellow', path: '/vehicle-taxi', tooltip: 'taxi' },
    ];

    const eventTypes = this.welfareEventTypes();
    const welfare = eventTypes.map(t => ({
      label: t.name_th,
      value: t.max_amount.toLocaleString('th-TH'),
      icon: this.WELFARE_META[t.code]?.icon ?? 'fas fa-gift',
      tooltip: this.WELFARE_META[t.code]?.tooltip,
      path: undefined as string | undefined,
      colorClass: undefined as string | undefined,
    }));

    return [...fixed, ...welfare];
  });


  workStartDate = BUSINESS_CONFIG.EMPLOYEE_START_DATE;

  attendancePeriod = computed(() => {
    const start = dayjs().startOf('year').format('DD/MM/YYYY');
    const end = dayjs().endOf('year').format('DD/MM/YYYY');
    return `${start} - ${end}`;
  });

  workDuration = computed(() => {
    const years = dayjs().diff(dayjs(this.workStartDate), 'year');
    return `${years} ปี`;
  });

  private currentViewMonthStart: dayjs.Dayjs | null = null;

  private applyHolidayListForMonth(monthStart: dayjs.Dayjs) {
    const start = monthStart.startOf('month');
    const end = start.endOf('month');

    this.holidays = (this.allHolidays || []).filter(h => {
      const t = dayjs(h.date).valueOf();
      return t >= start.valueOf() && t <= end.valueOf();
    });
  }

  onDatesSet(info: DatesSetArg) {
    this.zone.run(() => {
      // ✅ เดือนจริงของ view
      this.currentViewMonthStart = dayjs(info.view.currentStart).startOf('month');

      // ✅ ถ้า holiday ยังไม่โหลดมา อย่าเพิ่ง filter (ไม่งั้นจะได้ list ว่าง)
      if (!this.allHolidays?.length) return;

      this.applyHolidayListForMonth(this.currentViewMonthStart);
      this.cdr.detectChanges();
    });
  }
  onEventClick(arg: EventClickArg) {
    const p: any = arg.event.extendedProps;

    // กันคลิก holiday ถ้ามี
    if (p?.type !== 'leave') return;

    // ✅ ตัวอย่างใช้ SweetAlert2
    Swal.fire({
      title: `${p.fullName || ''} ${p.nickName ? '(' + p.nickName + ')' : ''}`,
      html: `
      <div style="text-align:left; line-height:1.7">
        <div><b>วันที่:</b> ${this.formatThaiDate(p.leaveDate)}</div>
        <div><b>เวลา:</b> ${p.timeText || '-'}</div>
        <div><b>ประเภท:</b> ${p.label || '-'}</div>
        ${p.dept ? `<div><b>แผนก:</b> ${p.dept}</div>` : ''}
      </div>
    `,
      icon: 'info',
      confirmButtonText: 'ปิด'
    });
  }
  onDateClick(arg: DateClickArg) {
    // กันคลิกวันที่ของเดือนอื่นที่โชว์จาง ๆ (optional)
    if (arg.view.type === 'dayGridMonth' && !arg.dayEl.classList.contains('fc-day')) return;

    this.zone.run(() => {
      const dateStr = dayjs(arg.date).format('YYYY-MM-DD');

      // ✅ ถ้าวันหยุด/เสาร์อาทิตย์ แล้วไม่อยากให้เปิดฟอร์ม ก็ใส่เงื่อนไขได้
      // if (this.holidayMap?.[dateStr]) return;

      this.selectedDate.set(dateStr);
      this.selectedRequestStatus.set('NEW');   // หรือค่า default ที่คุณใช้
      this.isFormOpen.set(true);

      this.cdr.detectChanges();
    });
  }
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    headerToolbar: { left: 'prev', center: 'title', right: 'next' },
    locale: 'th',
    firstDay: 0,
    contentHeight: 'auto',
    fixedWeekCount: false,
    eventDisplay: 'block',
    dayMaxEvents: 3,
    moreLinkClick: 'popover',
    datesSet: (info) => this.onDatesSet(info),
    eventDidMount: (info) => {
      info.el.title = info.event.title;
    },
    eventClick: (arg) => this.onEventClick(arg),
    dateClick: (arg) => this.onDateClick(arg),
    eventContent: (arg) => {
      return { html: `<div style="white-space:pre-line">${arg.event.title}</div>` };
    },

    dayCellContent: (arg: DayCellContentArg) => {
      const dateStr = dayjs(arg.date).format('YYYY-MM-DD');
      const dayNumber = arg.dayNumberText;

      const holiday = this.holidayMap?.[dateStr];
      const isWeekend = arg.date.getDay() === 0 || arg.date.getDay() === 6;

      let circleClass = '';
      let textClass = '';
      let noteText = '';
      let codeText = '001';

      if (holiday) {
        circleClass = 'circle-green-outline';
        textClass = 'text-green';
        noteText = holiday.name;
        codeText = 'OFF'; // หรือ HOL
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
    this.performanceList = this.dashboardService.getPerformanceList();
    this.getTeamCalendar();
    this.loadAllowanceSummary();
    this.loadVehicleSummary();
    this.loadWelfareEventTypes();
  }

  loadAllowanceSummary() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    if (!employeeCode) return;
    this.allowanceApiService.getClaims({ employee_code: employeeCode, page_size: 200 }).subscribe({
      next: (res) => {
        const total = (res.data ?? []).reduce((sum, c) => sum + (c.totalAmount ?? 0), 0);
        this.allowanceTotalAmount.set(total);
        this.cdr.markForCheck();
      },
      error: () => this.allowanceTotalAmount.set(0),
    });
  }

  loadWelfareEventTypes() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    if (!employeeCode) return;
    this.welfareService.getEventTypes(employeeCode).subscribe({
      next: (res) => {
        this.welfareEventTypes.set(res.data ?? []);
        this.cdr.markForCheck();
      },
      error: () => this.welfareEventTypes.set([]),
    });
  }

  loadVehicleSummary() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    if (!employeeCode) return;
    this.vehicleService.getVehicleClaimByEmpcode({ empCode: employeeCode, pageSize: 200 }).subscribe({
      next: (res) => {
        const items = res.data ?? res ?? [];
        const total = (Array.isArray(items) ? items : []).reduce((sum: number, c: any) => sum + (c.totalAmount ?? 0), 0);
        this.vehicleTotalAmount.set(total);
        this.cdr.markForCheck();
      },
      error: () => this.vehicleTotalAmount.set(0),
    });
  }

  getTeamCalendar() {
    const userData = this.authService.userData();

    forkJoin({
      holidays: this.teamCalendarService.getHoliday(),
      team: this.teamCalendarService.getTeamCalendar(userData.CODEMPID),
      color: this.teamCalendarService.getHolidayColor()
    }).subscribe(({ holidays, team, color }) => {
      console.log("team : ", team);

      this.allHolidays = (holidays || []).map((h: any) => ({
        id: h.ID,
        date: dayjs(h.HOLIDAY_DATE).format('YYYY-MM-DD'),
        name: h.HOLIDAY_NAME
      }));

      this.holidayMap = {};
      this.allHolidays.forEach(h => {
        this.holidayMap[h.date] = { id: h.id, name: h.name };
      });
      const colorMap: Record<string, string> = {};
      (color || []).forEach((c: any) => {
        colorMap[c.Type] = c.Rgb;
      });
      const holidayDates = new Set(Object.keys(this.holidayMap));

      const events: any[] = [];
      (team || []).forEach((emp: any) => {
        (emp.Leaves || []).forEach((lv: any, idx: number) => {
          const start = dayjs(lv.LeaveDate).format('YYYY-MM-DD');
          if (holidayDates.has(start)) return;

          events.push({
            id: `leave-${emp.EmpId}-${idx}-${start}`,
            title: `${lv.Nickname || emp.NameFirst} (${lv.LabelDescription || lv.Label || lv.LeaveType})\n${lv.DepartmentName}`,
            start,
            allDay: true,
            display: 'block',
            classNames: ['leave-event'],
            backgroundColor: colorMap[lv.LeaveType] || undefined,
            borderColor: colorMap[lv.LeaveType] || undefined,
            extendedProps: {
              type: 'leave',
              empId: emp.EmpId,
              leaveType: lv.LeaveType,
              fullName: lv.EmployeeName,
              nickName: lv.Nickname,
              label: lv.LabelDescription || lv.Label || lv.LeaveType,
              timeText: lv.TimeText || '09:00 - 18:00',
              reason: lv.Reason || lv.Remark || '',
              leaveDate: start,
              dept: lv.DepartmentName,
            }
          });
        });
      });

      // ✅ อัปเดต events เข้า calendar
      this.calendarOptions = { ...this.calendarOptions, events };

      // ✅ สำคัญ: หลัง holiday โหลดเสร็จ ให้ sync list ซ้ายกับเดือนที่กำลังเปิดอยู่ "ทันที"
      const monthToUse = this.currentViewMonthStart ?? dayjs().startOf('month');
      this.applyHolidayListForMonth(monthToUse);

      // ✅ My Time Attendance: นับการลาของ user ปัจจุบันในเดือนนี้
      const currentEmpId = userData.CODEMPID;
      const currentEmp = (team || []).find((emp: any) => emp.EmpId === currentEmpId);
      const yearStart = dayjs().startOf('year').valueOf();
      const yearEnd = dayjs().endOf('year').valueOf();

      const leaveCounts: Record<string, number> = {};
      (currentEmp?.Leaves || []).forEach((lv: any) => {
        const leaveDate = dayjs(lv.LeaveDate).valueOf();
        if (leaveDate >= yearStart && leaveDate <= yearEnd) {
          const label = lv.LabelDescription || lv.Label || lv.LeaveType || 'ลา';
          leaveCounts[label] = (leaveCounts[label] || 0) + 1;
        }
      });

      this.attendanceList = Object.keys(leaveCounts).length > 0
        ? Object.entries(leaveCounts).map(([label, count]) => ({ label, value: `${count} วัน` }))
        : [{ label: 'ไม่มีรายการลาในปีนี้', value: '-' }];

      this.cdr.detectChanges();
    });
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

  openTooltip(id: string) {
    this.tooltipModalId.set(id);
    this.isTooltipModalOpen.set(true);
  }

  closeTooltip() {
    this.isTooltipModalOpen.set(false);
    this.tooltipModalId.set('');
  }

  navigateTo(path: string | undefined) {
    if (path) {
      this.router.navigate([path]);
    }
  }

  /** ล้างข้อมูลใน LocalStorage เพื่อรีเซ็ตสถานะระบบใหม่ */
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

  formatThaiDate(dateStr: string): string {
    const d = new Date(dateStr);

    const day = d.getDate();
    const month = d.toLocaleString('th-TH', { month: 'long' });
    const year = d.getFullYear() + 543;

    return `${day} ${month} ${year}`;
  }

  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  closeForm() {
    this.isFormOpen.set(false);
  }
}

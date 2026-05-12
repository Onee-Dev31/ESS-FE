import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
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
import { VehicleService } from '../../services/vehicle.service';
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
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';
import { NgZone } from '@angular/core';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import Swal from 'sweetalert2';
import { color } from 'echarts';
import { TaxiService } from '../../services/taxi.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { ItAssetService } from '../../services/it-asset.service';
import { ThemeService } from '../../services/theme.service';
import { AllowanceService } from '../../services/allowance.service';

interface ProfileItem {
  label: string;
  value: string;
  icon?: string;
  iconColor?: string;
}
interface AttendanceItem {
  label: string;
  value: string;
}
interface PerformanceItem {
  year: string;
  grade: string;
}

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
    TimeOffForm,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  [x: string]: any;
  private router = inject(Router);
  private userService = inject(UserService);
  private dashboardService = inject(DashboardService);
  private dialogService = inject(DialogService);
  private allowancService = inject(AllowanceService);
  private vehicleService = inject(VehicleService);
  private taxiService = inject(TaxiService);
  private itAssetService = inject(ItAssetService);
  private themeService = inject(ThemeService);
  authService = inject(AuthService);
  dateUtil = inject(DateUtilityService);

  constructor(
    private teamCalendarService: TeamCalendarService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {
    effect(() => {
      this.themeService.isDarkMode();
      this.getTeamCalendar();
    });
  }

  userRole = this.authService.userRole;

  isPolicyModalOpen = signal<boolean>(false);
  isTimeOffModalOpen = signal<boolean>(false);
  isTooltipModalOpen = signal<boolean>(false);
  tooltipModalId = signal<string>('');
  selectedLeaveTypeId = signal<string>('');

  userProfile = toSignal(this.userService.getUserProfile());
  medicalStats = toSignal(this.dashboardService.getMedicalStats());

  isLoading = true;
  // pendingCount = toSignal(this.dashboardService.getGlobalPendingCount(), { initialValue: 0 });
  // medicalPendingCount = toSignal(this.dashboardService.getMedicalPendingCount(), {
  //   initialValue: 0,
  // });

  // MASTER
  leavePolicyMaster = signal<any[]>([]);
  performanceData = signal<any>(null);
  itAsset = signal<any>(null);
  oneeUser = signal<any>(null);
  itStoryMap = signal<any>(null);
  leaveStats = signal<any>([]);

  /** แปลงข้อมูลสถิติการเบิกค่ารักษาพยาบาลเพื่อใช้ในการแสดงผล (ProgressBar และสี) */
  medicalStatsDisplay = computed(() => {
    const stats = this.medicalStats();
    if (!stats) return null;
    return stats.map((stat) => {
      let balanceColor = 'text-balance';
      let progressColor = 'bg-primary';

      switch (stat.type) {
        case 'outpatient':
          progressColor = 'bg-red';
          break;
        case 'dental':
          progressColor = 'bg-blue';
          break;
        case 'optical':
          progressColor = 'bg-indigo';
          break;
        case 'inpatient':
          progressColor = 'bg-green';
          break;
      }

      return { ...stat, balanceColor, progressColor };
    });
  });

  /** ฟอร์แมตข้อมูลสถิติการลา (สี, ไอคอน, ธีม) ตามประเภทการลา */
  leaveStatsDisplay = computed(() => {
    const stats = this.leaveStats();
    if (!stats) return null;
    return stats.map((leave: any) => {
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
      {
        label: 'เบอร์โทรศัพท์',
        value: user.USR_MOBILE || '-',
        icon: 'fas fa-phone-alt',
        iconColor: '#ffffff',
      },
      {
        label: 'แผนก',
        value: user.DEPARTMENT || '-',
        icon: 'fas fa-sitemap',
        iconColor: '#ffffff',
      },
      {
        label: 'บริษัท',
        value: user.COMPANY_NAME || '-',
        icon: 'fas fa-building',
        iconColor: '#ffffff',
      },
    ];
  });

  /** อุปกรณ์ IT ที่พนักงานครอบครอง (MOCK DATA) */
  // itList = computed<ProfileItem[]>(() => {
  //   const profile = this.userProfile();
  //   if (!profile?.itAssets) return [];
  //   return [
  //     { label: 'Account เข้าเครื่องคอม, Email, Wifi', value: profile.itAssets.account },
  //     { label: 'Account expire date', value: profile.itAssets.expireDate },
  //     { label: 'Laptop', value: profile.itAssets.laptop },
  //     { label: 'PC', value: profile.itAssets.pc },
  //     { label: 'Monitor', value: profile.itAssets.monitor }
  //   ];
  // });

  attendanceList: any[] = [];
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
      name: `${user.USR_FNAME ?? ''} ${user.USR_LNAME ?? ''}`.trim(),
    });
  }

  closeProfileLightbox() {
    this.profileLightbox.set(null);
  }
  selectedRequestStatus = signal<string>('');
  allowanceTotalAmount = signal<number | null>(null);
  vehicleTotalAmount = signal<number | null>(null);
  vehicleTaxiTotalAmount = signal<number | null>(null);

  welfareStats = computed(() => {
    const allowanceAmt = this.allowanceTotalAmount();
    const allowanceValue = allowanceAmt === null ? '...' : allowanceAmt.toLocaleString('th-TH');
    const vehicleAmt = this.vehicleTotalAmount();
    const vehicleValue = vehicleAmt === null ? '...' : vehicleAmt.toLocaleString('th-TH');
    const vehicleTaxiAmt = this.vehicleTaxiTotalAmount();
    const vehicleTaxiValue =
      vehicleTaxiAmt === null ? '...' : vehicleTaxiAmt.toLocaleString('th-TH');
    return [
      {
        label: 'ค่าเบี้ยเลี้ยง',
        value: allowanceValue,
        icon: 'fas fa-dollar-sign',
        colorClass: 'card-green',
        path: '/allowance',
      },
      {
        label: 'ค่ารถ',
        value: vehicleValue,
        icon: 'fas fa-car',
        colorClass: 'card-blue',
        path: '/vehicle',
        tooltip: 'transport',
      },
      {
        label: 'ค่าแท็กซี่',
        value: vehicleTaxiValue,
        icon: 'fas fa-taxi',
        colorClass: 'card-yellow',
        path: '/vehicle-taxi',
        tooltip: 'taxi',
      },
      { label: 'ค่าสมรส', value: '3,500', icon: 'fas fa-heart', tooltip: 'wedding' },
      { label: 'ค่าอุปสมบท', value: '10,500', icon: 'fas fa-hands-praying', tooltip: 'ordination' },
      { label: 'ค่าฌาปนกิจ', value: '584', icon: 'fas fa-church', tooltip: 'funeral' },
      { label: 'ค่าพวงหรีด', value: '876', icon: 'fas fa-spa', tooltip: 'wreath' },
    ];
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

    this.holidays = (this.allHolidays || []).filter((h) => {
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
      confirmButtonText: 'ปิด',
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
      this.selectedRequestStatus.set('NEW'); // หรือค่า default ที่คุณใช้
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
      `,
      };
    },
  };

  ngOnInit() {
    this.performanceList = this.dashboardService.getPerformanceList();
    this.getTeamCalendar();

    this.loadInitialData().subscribe({
      next: ([
        leaveDashboard,
        performanceData,
        itAsset,
        oneeUser,
        allowanceSummary,
        vehicleSummary,
        taxiSummary,
      ]) => {
        this.leavePolicyMaster.set(leaveDashboard);
        this.performanceData.set(performanceData);
        this.itAsset.set(itAsset);
        this.oneeUser.set(oneeUser);
        this.allowanceTotalAmount.set(allowanceSummary ?? 0);
        this.vehicleTotalAmount.set(vehicleSummary ?? 0);
        this.vehicleTaxiTotalAmount.set(taxiSummary ?? 0);

        this.loadAfterData();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.router.navigate(['/welcome']);
        console.error('Error loading initial data', err);
      },
    });
  }

  loadInitialData() {
    const userAd = this.authService.userData().AD_USER.toLowerCase();
    // 1
    return forkJoin([
      this.getLeaveDashboard(),
      this.getPerformance(),
      this.getItAssetByAduser(userAd),
      this.getOneeuserByAduser(userAd),
      this.loadAllowanceSummary(),
      this.loadVehicleSummary(),
      this.loadVehicleTaxiSummary(),
    ]);
  }

  loadAfterData() {
    // 2
    this.mapLeave();
    this.mapItStory();
  }

  loadAllowanceSummary() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    if (!employeeCode) return of(0);
    return this.allowancService.getClaims({ employee_code: employeeCode, page_size: 200 }).pipe(
      map((res: any) => {
        const items = res.data ?? [];
        const total = items.reduce(
          (sum: any, c: { totalAmount: any }) => sum + (c.totalAmount ?? 0),
          0,
        );
        return total;
      }),
      catchError(() => of(0)),
    );
  }

  loadVehicleSummary() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    if (!employeeCode) return of(0);
    return this.vehicleService
      .getVehicleClaimByEmpcode({ empCode: employeeCode, pageSize: 200 })
      .pipe(
        map((res: any) => {
          const items = res.data ?? res ?? [];
          const total = (Array.isArray(items) ? items : []).reduce(
            (sum: number, c: any) => sum + (c.totalAmount ?? 0),
            0,
          );
          return total;
        }),
        catchError(() => of(0)),
      );
  }

  loadVehicleTaxiSummary() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    if (!employeeCode) {
      return of(null);
    }
    return this.taxiService.getTaxiClaims({ empCode: employeeCode, pageSize: 200 }).pipe(
      map((res: any) => {
        const items = res.data ?? [];
        const total = (Array.isArray(items) ? items : []).reduce(
          (sum, c) => sum + (c.totalAmount ?? 0),
          0,
        );
        return total;
      }),
      catchError((err) => {
        this.vehicleTaxiTotalAmount.set(0);
        return of(null);
      }),
    );
  }

  getTeamCalendar() {
    const userData = this.authService.userData();

    forkJoin({
      holidays: this.teamCalendarService.getHoliday(),
      team: this.teamCalendarService.getTeamCalendar(userData.CODEMPID),
      color: this.teamCalendarService.getHolidayColor(),
    }).subscribe(({ holidays, team, color }) => {
      this.allHolidays = (holidays || []).map((h: any) => ({
        id: h.ID,
        date: dayjs(h.HOLIDAY_DATE).format('YYYY-MM-DD'),
        name: h.HOLIDAY_NAME,
      }));

      this.holidayMap = {};
      this.allHolidays.forEach((h) => {
        this.holidayMap[h.date] = { id: h.id, name: h.name };
      });
      const colorMap: Record<string, any> = {};
      (color || []).forEach((c: any) => {
        colorMap[c.Type] = {
          rgb: c.Rgb,
          rgbDark: c.RgbDark,
        };
      });
      const holidayDates = new Set(Object.keys(this.holidayMap));

      const isDark = this.themeService.isDarkMode();

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
            backgroundColor: colorMap[lv.LeaveType]
              ? isDark
                ? colorMap[lv.LeaveType].rgbDark
                : colorMap[lv.LeaveType].rgb
              : undefined,
            borderColor: colorMap[lv.LeaveType]
              ? isDark
                ? colorMap[lv.LeaveType].rgbDark
                : colorMap[lv.LeaveType].rgb
              : undefined,
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
            },
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

      this.attendanceList =
        Object.keys(leaveCounts).length > 0
          ? Object.entries(leaveCounts).map(([label, count]) => ({ label, value: count }))
          : // ? Object.entries(leaveCounts).map(([label, count]) => ({ label, value: `${count} วัน` }))
            [{ label: 'ไม่มีรายการลาในปีนี้', value: '-' }];

      this.cdr.detectChanges();
    });
  }

  getPerformance() {
    const empCode = this.authService.userData().CODEMPID;
    return this.dashboardService.getPerformanceByEmpCode(empCode).pipe(
      map((res: any) => {
        return res.data;
      }),
      catchError((err) => {
        console.error('Error loading performance dashboard', err);
        return of(null);
      }),
    );
  }

  getItAssetByAduser(adUser: string) {
    return this.itAssetService.GetItAssetByAD('SNIPE-IT', adUser);
  }

  getOneeuserByAduser(adUser: string) {
    return this.itAssetService.getOneeuserByAd(adUser);
  }

  getLeaveDashboard() {
    const empCode = this.authService.userData().CODEMPID;
    const yearCurrent = dayjs().format('YYYY-MM-DD');
    return this.dashboardService
      .getLeaveSummaryDashboard({
        empCode: empCode,
        year: yearCurrent,
      })
      .pipe(
        map((res: any) => {
          return res.data;
        }),
        catchError((err) => {
          console.error('Error loading leave dashboard', err);
          return of(null);
        }),
      );
  }

  mapLeave() {
    const mapLeave = this.leavePolicyMaster().map((item: any) => {
      return {
        ...item,
        used_days:
          (this.attendanceList.find((att: any) => att.label === item.leave_name_th) || {}).value ||
          item.used_days,
      };
    });
    this.leaveStats.set(mapLeave);
  }

  mapItStory() {
    const assets = this.itAsset().data.rows || [];
    const user = this.oneeUser() || [];
    const map = [
      {
        label: 'Account เข้าเครื่องคอม, Email, Wifi',
        value: user.SamAccountName,
      },
      {
        label: 'password expire date',
        value: user.PasswordExpirationDate,
      },
      ...assets.map((item: any) => ({
        label: item.category.name,
        value: item.model.name,
      })),
    ];

    this.itStoryMap.set(map);
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

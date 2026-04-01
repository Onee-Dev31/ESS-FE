import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { ChartMode, KpiCard, StatusKey } from '../../../interfaces/it-dashboard.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NgxEchartsDirective, NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import type { ECharts } from 'echarts'; // ✅ ไม่ใช้ EChartsType
import { ItServiceService } from '../../../services/it-service.service';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import * as XLSX from 'xlsx';
import { DateUtilityService } from '../../../services/date-utility.service';
import dayjs, { Dayjs } from 'dayjs';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
type PieDatum = { name: string; value: number; key?: string };
import { encryptValue } from '../../../utils/crypto.js ';
import { MasterDataService } from '../../../services/master-data.service';

@Component({
  selector: 'app-it-dashboard-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NgxEchartsDirective,
    NgxEchartsModule,
    NzTableModule,
    NzModalModule,
    NzPaginationModule,
    NzDatePickerModule
  ],
  templateUrl: './it-dashboard-summary.html',
  styleUrl: './it-dashboard-summary.scss',
})
export class ItDashboardSummary {
  @Output() statusChange = new EventEmitter<string | null>();

  // ===== KPI =====
  activeStatus: string = 'all';
  selectedStatus: string = 'all';
  kpis: KpiCard[] = [
    { status: 'Open', title: 'Open tickets', value: 0, delta: 0, hint: 'Tickets ใหม่ทั้งหมดที่มีการเปิดมา', icon: 'inbox' },
    { status: 'Assigned', title: 'Assigned Tickets', value: 0, delta: 0, hint: 'Tickets ที่ได้รับมอบหมาย', icon: 'user' },
    { status: 'In Progress', title: 'In Progress Tickets', value: 0, delta: 0, hint: 'Tickets ที่กำลังดำเนินการ', icon: 'sync' },
    { status: 'Closed', title: 'Closed Tickets', value: 0, delta: 0, hint: 'Tickets ที่ปิดแล้ว', icon: 'check-circle' },
    { status: 'Hold', title: 'Hold Tickets', value: 0, delta: 0, hint: 'Tickets ที่หยุดทำการ', icon: 'pause-circle' },
    { status: 'Deny', title: 'Deny Tickets', value: 0, delta: 0, hint: 'Tickets ที่ถูกปฏิเสธ', icon: 'stop' },
    { status: 'All', title: 'All Tickets', value: 0, delta: 0, hint: 'Tickets ทั้งหมดทุกสถานะ', icon: 'appstore' }
  ];
  showDeptBar = false;
  selectedCompany: string | null = null;

  deptBarOption: EChartsOption = {};
  trackByStatus(index: number, item: KpiCard) {
    return item.status;
  }
  statusPieOption!: EChartsOption;
  servicePieOption!: EChartsOption;
  companyBarOption!: EChartsOption;
  private statusChart?: ECharts;

  // map key -> index ใน pie (ต้องตรงกับ data ที่ใส่ใน option)
  private statusIndexMap: Record<string, number> = {
    open: 0,
    assigned: 1,
    inprogress: 2,
    done: 3,
    all: -1
  };
  private deptTop5Map: Record<string, Array<{ label: string; value: number }>> = {};
  isLogModalVisible = false;
  currentStatus = '';
  ticketLogs: any[] = [];

  page = 1;
  pageSize = 10;

  searchKeyword = '';
  filter = {
    ticketNo: '',
    subject: '',
    requester: '',
    department: '',
    company: '',
    dateRange: null as [Dayjs, Dayjs] | null
  };
  departmentList: any[] = [];
  companyList: any[] = [];
  filteredTicketLogs: any[] = [];
  filteredDepartmentList: any[] = [];
  constructor(
    private itServiceService: ItServiceService,
    private cdr: ChangeDetectorRef,
    private masterService: MasterDataService
  ) { }

  ngOnInit(): void {
    this.selectStatus('all', false);
    this.getAllTickets();
    this.getCompanies();
    this.getDepartments();
  }

  // ====== 1) Status Donut ======

  private updateKpis(summary: any) {
    this.kpis = [
      {
        status: 'open',
        title: 'Open tickets',
        value: summary.open ?? 0,
        delta: 0,
        hint: 'Tickets ใหม่ทั้งหมดที่มีการเปิดมา',
        icon: 'inbox'
      },
      {
        status: 'assigned',
        title: 'Assigned Tickets',
        value: summary.assigned ?? 0,
        delta: 0,
        hint: 'Tickets ที่ได้รับมอบหมาย',
        icon: 'user'
      },
      {
        status: 'inprogress',
        title: 'In Progress Tickets',
        value: summary.inProcess ?? 0,
        delta: 0,
        hint: 'Tickets ที่กำลังดำเนินการ',
        icon: 'sync'
      },
      {
        status: 'done',
        title: 'Closed Tickets',
        value: summary.closed ?? 0,
        delta: 0,
        hint: 'Tickets ที่ปิดแล้ว',
        icon: 'check-circle'
      },
      {
        status: 'hold',
        title: 'Hold Tickets',
        value: summary.hold ?? 0,
        delta: 0,
        hint: 'Tickets ที่หยุดทำการ',
        icon: 'pause-circle'
      },
      {
        status: 'denied',
        title: 'Deny Tickets',
        value: summary.denied ?? 0,
        delta: 0,
        hint: 'Tickets ที่ถูกปฏิเสธ',
        icon: 'stop'
      },
      {
        status: 'all',
        title: 'All Tickets',
        value: summary.all ?? 0,
        delta: 0,
        hint: 'Tickets ทั้งหมดทุกสถานะ',
        icon: 'appstore'
      },

    ];
  }
  private buildStatusPie(summary: any) {

    const data: PieDatum[] = [
      { name: 'Open', value: summary.open ?? 0, key: 'open' },
      { name: 'Assigned', value: summary.assigned ?? 0, key: 'assigned' },
      { name: 'In Progress', value: summary.inProcess ?? 0, key: 'inprogress' },
      { name: 'Closed', value: summary.closed ?? 0, key: 'done' },
      { name: 'Deny', value: summary.denied ?? 0, key: 'denied' },
      { name: 'Hold', value: summary.hold ?? 0, key: 'hold' }
    ];

    const total = data.reduce((s, x) => s + x.value, 0);

    this.statusPieOption = this.makeDonutOption(
      'Status Distribution',
      data,
      total,
      'Total'
    );
  }
  // ====== 2) Service Donut ======
  private buildServicePie(res: any[]) {

    const data: PieDatum[] = res.map(x => ({
      name: x.name_th,
      value: x.ticket_count
    }));

    const total = data.reduce((s, x) => s + x.value, 0);

    this.servicePieOption = this.makeDonutOptionService(
      'Service Type',
      data,
      total,
      'Total'
    );
  }
  // ====== 3) Top Companies Bar ======
  private buildCompanyBar(res: any[]) {

    const chartData = res.map(x => ({
      value: x.ticket_count,
      code: x.COMPANY_CODE,
      name: x.COMPANY_NAME
    }));

    const labels = chartData.map(x => x.code);

    const textColor =
      getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a';

    this.companyBarOption = {
      grid: { left: 18, right: 18, top: 18, bottom: 26, containLabel: true },

      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = params[0];
          const data = item.data;

          return `
          <div style="font-weight:700">${data.name}</div>
          <div>Tickets: ${data.value}</div>
        `;
        }
      },

      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontWeight: 700, color: textColor }
      },

      yAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false }
      },

      series: [
        {
          type: 'bar',
          data: chartData,
          barWidth: 46,
          itemStyle: { borderRadius: [12, 12, 12, 12] },
          emphasis: { focus: 'series' }
        }
      ]
    };

    const firstCompany = labels[0];

    this.selectedCompany = firstCompany;
    this.showDeptBar = !!firstCompany;

    if (firstCompany) {
      this.buildDeptBar(firstCompany, this.deptTop5Map[firstCompany] ?? []);
    }
  }

  private buildDeptTop5Map(rows: any[]) {
    const map: Record<string, Array<{ label: string; value: number }>> = {};

    for (const row of rows ?? []) {
      const companyCode = row.COMPANY_CODE;
      if (!companyCode) continue;

      if (!map[companyCode]) {
        map[companyCode] = [];
      }

      map[companyCode].push({
        label: row.dept_display,
        value: row.ticket_count
      });
    }

    this.deptTop5Map = map;
  }

  private makeDonutOption(title: string, data: PieDatum[], centerValue: number, centerLabel: string): EChartsOption {
    return {
      legend: {
        top: -5,
        left: 'center',
        orient: 'horizontal',
        itemWidth: 25,
        itemHeight: 12,
        itemGap: 10,
        icon: 'roundRect',
        textStyle: {
          fontSize: 10,
          fontWeight: 400,
          overflow: 'truncate'
        },
        width: '100%',
        type: 'plain',
      },
      tooltip: { trigger: 'item' },
      color: [
        this.getCssVar('--status-open-text')
        , this.getCssVar('--status-assigned-text')
        , this.getCssVar('--status-progress-text')
        , this.getCssVar('--status-closed-text')
        , this.getCssVar('--status-deny-text')
        , this.getCssVar('--status-hold-text')
      ],
      series: [
        {
          type: 'pie',
          top: '16px',
          radius: ['55%', '82%'],
          center: ['50%', '53%'],
          label: { show: false },
          labelLine: { show: false },
          avoidLabelOverlap: true,
          emphasis: { scale: true, scaleSize: 6 },
          data
        }
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '46%',
          style: { text: String(centerValue), fontSize: 28, fontWeight: 800, fill: getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a' }
        },
        {
          type: 'text',
          left: 'center',
          top: '58%',
          style: { text: centerLabel, fontSize: 12, fill: getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b' }
        }
      ]
    };
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  private makeDonutOptionService(title: string, data: PieDatum[], centerValue: number, centerLabel: string): EChartsOption {
    return {
      legend: {
        top: -5,
        left: 'center',
        orient: 'horizontal',
        itemWidth: 18,
        itemHeight: 12,
        icon: 'roundRect',
        textStyle: {
          fontSize: 10,
          fontWeight: 400,
          overflow: 'truncate'
        },
        width: '100%',
        type: 'plain',
      },
      tooltip: { trigger: 'item' },
      color: [
        this.getCssVar('--btn-service-border'),
        this.getCssVar('--btn-repair-border'),
        this.getCssVar('--btn-problem-border'),
      ],
      series: [
        {
          type: 'pie',
          top: '16px',
          radius: ['55%', '82%'],
          center: ['50%', '53%'],
          label: { show: false },
          labelLine: { show: false },
          avoidLabelOverlap: true,
          emphasis: { scale: true, scaleSize: 6 },
          data
        }
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '46%',
          style: { text: String(centerValue), fontSize: 28, fontWeight: 800, fill: getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a' }
        },
        {
          type: 'text',
          left: 'center',
          top: '58%',
          style: { text: centerLabel, fontSize: 12, fill: getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b' }
        }
      ]
    };
  }
  getAllTotal(): number {
    return this.kpis.find(x => x.status === 'all')?.value ?? 0;
  }

  getPercent(k: KpiCard): number {
    const total = this.getAllTotal();
    if (!total || k.status === 'all') return 100;
    return Math.round((k.value / total) * 100);
  }
  onStatusChartInit(ec: any) {
    this.statusChart = ec;
    this.applyStatusCenter('all');
  }

  onStatusPieClick(e: any) {
    const key = e?.data?.key as StatusKey | undefined;
    if (key) this.selectStatus(key);
  }

  selectStatus(k: string, isClick: boolean = true) {

    this.currentStatus = this.statusLabel(k)
    this.activeStatus = k;
    this.selectedStatus = k;
    if (isClick) {
      this.openTicketLogs(this.currentStatus);
    }

    this.statusChange.emit(k);

    this.highlightStatusSlice(k);

    this.applyStatusCenter(k);
  }

  private highlightStatusSlice(k: string) {
    if (!this.statusChart) return;

    // ล้าง highlight ทุกอันก่อน
    this.statusChart.dispatchAction({ type: 'downplay', seriesIndex: 0 });

    const dataIndex = this.statusIndexMap[k];
    if (dataIndex >= 0) {
      this.statusChart.dispatchAction({
        type: 'highlight',
        seriesIndex: 0,
        dataIndex
      });

      this.statusChart.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex
      });
    } else {
      this.statusChart.dispatchAction({ type: 'hideTip' });
    }
  }

  private applyStatusCenter(k: string) {
    const data = (this.statusPieOption?.series as any)?.[0]?.data as any[] | undefined;
    if (!data?.length) return;

    const total = data.reduce((s, x) => s + Number(x.value ?? 0), 0);

    let centerValue = total;
    let centerLabel = 'Total';

    if (k !== 'all') {
      const idx = this.statusIndexMap[k];
      if (idx >= 0) {
        centerValue = Number(data[idx].value ?? 0);
        centerLabel = String(data[idx].name ?? '');
      }
    }

    const opt = this.statusPieOption as any;
    opt.graphic = [
      { type: 'text', left: 'center', top: '46%', style: { text: String(centerValue), fontSize: 28, fontWeight: 800, fill: getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a' } },
      { type: 'text', left: 'center', top: '58%', style: { text: centerLabel, fontSize: 12, fill: getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b' } }
    ];

    this.statusChart?.setOption(opt, { notMerge: false, lazyUpdate: true });
  }

  onCompanyBarClick(e: any) {

    const company = (e?.data.code ?? '').toString();
    if (!company) return;

    this.selectedCompany = company;
    this.showDeptBar = true;

    const depts = this.deptTop5Map[company] ?? [];
    this.buildDeptBar(company, depts);
  }

  private buildDeptBar(company: string, rows: Array<{ label: string; value: number }>) {
    const data = [...rows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(x => ({
        name: x.label,
        value: x.value
      }));

    const labels = data.map(x => x.name);

    const textColor =
      getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a';

    this.deptBarOption = {
      title: {
        text: `Top 5 Departments - ${company}`,
        left: 'left',
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 800, color: textColor }
      },
      grid: { left: 10, right: 18, top: 36, bottom: 10, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = params?.[0];
          const row = item?.data;
          if (!row) return '';

          return `
          <div style="font-weight:700">${row.name}</div>
          <div>Tickets: ${row.value}</div>
        `;
        }
      },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLabel: { show: false },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontWeight: 700, color: textColor }
      },
      series: [
        {
          type: 'bar',
          data: data,
          barWidth: 16,
          itemStyle: { borderRadius: [10, 10, 10, 10] },
          emphasis: { focus: 'series' }
        }
      ]
    };
  }

  getAllTickets() {
    this.itServiceService.getAllTickets({ page: 1, pageSize: 9999 }).subscribe({
      next: (res) => {
        this.updateKpis(res.summary)
        this.buildStatusPie(res.summary)
        this.buildServicePie(res.serviceTypes);
        this.buildDeptTop5Map(res.topDepartments);
        this.buildCompanyBar(res.topCompanies);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  openTicketLogs(status: string): void {
    this.currentStatus = status;
    this.page = 1;
    this.ticketLogs = [];
    this.isLogModalVisible = true;
    this.loadTickets(status);
  }

  loadTickets(status: string): void {
    this.itServiceService.getTicketByStatus(status).subscribe({
      next: (res: any) => {
        this.ticketLogs = Array.isArray(res?.data) ? res.data : [];
        this.filteredTicketLogs = this.ticketLogs

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('loadTickets error:', err);
        this.ticketLogs = [];
      }
    });
  }

  handleCancel(): void {
    this.isLogModalVisible = false;
    this.ticketLogs = [];
    this.page = 1;
  }

  viewTicket(data: any): void {
    const encryptedId = encryptValue(String(data.id));
    window.open(`/it-dashboard/report-detail?id=${encodeURIComponent(encryptedId)}`, '_blank');
  }

  onPageIndexChange(page: number): void {
    this.page = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = +size;
    this.page = 1;
  }

  get pagedTicketLogs(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.ticketLogs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.ticketLogs.length / this.pageSize));
  }

  getPriorityClass(priority: string): string {
    switch ((priority || '').toLowerCase()) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-default';
    }
  }

  statusLabel(status: string) {
    switch (status) {
      case 'open': return 'Open';
      case 'assigned': return 'Assigned';
      case 'inprogress': return 'In Progress';
      case 'done': return 'Closed';
      case 'denied': return 'Denied';
      case 'hold': return 'Hold';
      case 'all': return 'All';
      default: return this.currentStatus;
    }
  }

  applyFilter() {

    const range = this.filter.dateRange;
    const [rawFrom, rawTo] = range ?? [];
    const from = rawFrom ? dayjs(rawFrom) : null;
    const to = rawTo ? dayjs(rawTo) : null;

    this.filteredTicketLogs = this.ticketLogs.filter(t => {

      const ticketNoMatch =
        !this.filter.ticketNo ||
        t.ticket_number?.toLowerCase().includes(this.filter.ticketNo.toLowerCase());

      const subjectMatch =
        !this.filter.subject ||
        t.subject?.toLowerCase().includes(this.filter.subject.toLowerCase());

      const requesterMatch =
        !this.filter.requester ||
        t.requester_name?.toLowerCase().includes(this.filter.requester.toLowerCase());

      const deptMatch =
        !this.filter.department ||
        t.deptName === this.filter.department;

      const companyMatch =
        !this.filter.company ||
        t.COMPANY_CODE === this.filter.company;

      const rawDate = t.updated_at || t.created_at;
      const itemDate = dayjs(rawDate);

      let dateMatch = true;

      if (from && to) {

        dateMatch =
          itemDate.isAfter(from.startOf('day')) &&
          itemDate.isBefore(to.endOf('day'));
      }

      return ticketNoMatch &&
        subjectMatch &&
        requesterMatch &&
        deptMatch &&
        companyMatch &&
        dateMatch;

    });

    this.page = 1;
  }

  exportData() {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredTicketLogs);

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Tickets': worksheet },
      SheetNames: ['Tickets']
    };
    XLSX.writeFile(workbook, 'TicketLogs.xlsx');
  }

  // GET MASTER
  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
        this.companyList = data
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  getDepartments() {
    this.masterService.getDepartmentMaster().subscribe({
      next: (data) => {
        this.departmentList = data
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  onCompanyChange() {

    this.filter.department = '';

    if (!this.filter.company) {
      this.filteredDepartmentList = [];
      return;
    }

    this.filteredDepartmentList = this.departmentList.filter(
      d => d.COMPANY_CODE === this.filter.company
    );

    this.applyFilter();
  }
}
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { KpiCard, StatusKey } from '../../../interfaces/it-dashboard.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { EChartsOption } from 'echarts';
import type { ECharts } from 'echarts'; // ✅ ไม่ใช้ EChartsType
import { ItServiceService } from '../../../services/it-service.service';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { DateUtilityService } from '../../../services/date-utility.service';
import dayjs, { Dayjs } from 'dayjs';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
type PieDatum = { name: string; value: number; key?: string };
import { encryptValue } from '../../../utils/crypto.js ';
import { MasterDataService } from '../../../services/master-data.service';
import { ViewChildren, QueryList } from '@angular/core';
import { ItDashboardSummary } from '../it-dashboard-summary/it-dashboard-summary';
import { PaginationComponent } from '../../../components/shared/pagination/pagination';
import { createListingComputeds_v2, createListingState } from '../../../utils/listing.util';
import { exportTicketLogsToExcel } from '../../../utils/ticket-log-excel.util';

@Component({
  selector: 'app-report',
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzTableModule,
    NzModalModule,
    NzPaginationModule,
    NzDatePickerModule,
    PaginationComponent,
  ],
  templateUrl: './report.html',
  styleUrl: './report.scss',
})
export class Report {
  @Output() statusChange = new EventEmitter<string | null>();
  @Input() set externalStatus(status: string | null) {
    if (status && status !== this.activeStatus) {
      this.selectStatus(status, false);
    }
  }

  // @Input() set summaryData(res: any) {
  //   if (!res) return;
  //   this.updateKpis(res.summary);
  //   this.buildStatusPie(res.summary);
  //   this.buildServicePie(res.serviceTypes);
  //   this.buildDeptTop5Map(res.topDepartments);
  //   this.buildCompanyBar(res.topCompanies);
  //   this.cdr.detectChanges();
  // }

  allRequests = signal<any[]>([]);
  listing = createListingState();
  comps = createListingComputeds_v2(this.allRequests, this.listing);

  // ===== KPI =====
  activeStatus: string = 'all';
  selectedStatus: string = 'all';
  kpis: KpiCard[] = [
    {
      status: 'all',
      title: 'All',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-border-all',
    },
    {
      status: 'done',
      title: 'Closed',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-circle-check',
    },
    {
      status: 'assigned',
      title: 'In Progress',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-diagram-project',
    },
    {
      status: 'open',
      title: 'New',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-folder-open',
    },
    {
      status: 'reopen',
      title: 'Re-Opened',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-repeat',
    },
    {
      status: 'waitingapproval',
      title: 'Waiting Approval',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-hourglass-start',
    },
    {
      status: 'referredBack',
      title: 'Referred Back',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-clock-rotate-left',
    },
    {
      status: 'rejected',
      title: 'Rejected',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-ban',
    },
    {
      status: 'denied',
      title: 'Deny',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-ban',
    },
    {
      status: 'hold',
      title: 'Hold',
      value: 0,
      delta: 0,
      icon: 'fa-solid fa-pause',
    },
  ];
  showDeptBar = false;
  selectedCompany: string | null = null;

  deptBarOption: EChartsOption = {};
  trackByStatus(index: number, item: KpiCard) {
    return item.status;
  }
  statusPieOption!: EChartsOption;
  servicePieOption!: EChartsOption;
  serviceDistributionData: PieDatum[] = [];
  serviceDistributionLegendData: PieDatum[] = [];
  companyDistributionData: Array<{ value: number; code: string; name: string }> = [];
  departmentDistributionData: Array<{
    name: string;
    value: number;
    costcent?: string;
    companyCode?: string;
  }> = [];
  companyBarOption!: EChartsOption;
  private statusChart?: ECharts;

  // map key -> index ใน pie (ต้องตรงกับ data ที่ใส่ใน option)
  private statusIndexMap: Record<string, number> = {
    done: -1,
    assigned: 0,
    open: 1,
    reopen: 2,
    waitingapproval: 3,
    referredBack: 4,
    rejected: 5,
    hold: 6,
    denied: 7,
    all: -1,
  };
  private deptTop5Map: Record<
    string,
    Array<{ label: string; value: number; costcent: string; companyCode: string }>
  > = {};
  isExporting = false;
  isLogModalVisible = false;
  currentStatus = '';
  ticketLogs: any[] = [];

  page = 1;
  pageSize = 10;

  searchKeyword = '';
  filter = {
    status: '',
    ticketNo: '',
    subject: '',
    requester: '',
    department: '',
    company: '',
    dateRange: null as [Date, Date] | null,
    serviceType: '',
    subProblemCategoryId: null as number | null,
  };
  filterOriginal = {
    status: '',
    ticketNo: '',
    subject: '',
    requester: '',
    department: '',
    company: '',
    dateRange: null as [Date, Date] | null,
    serviceType: '',
    subProblemCategoryId: null as number | null,
  };
  textClickFilter: string = '';
  departmentList: any[] = [];
  companyList: any[] = [];
  subProblemList: { id: number; sub_category_name: string }[] = [];
  filteredTicketLogs: any[] = [];
  filteredDepartmentList: any[] = [];
  constructor(
    private itServiceService: ItServiceService,
    private cdr: ChangeDetectorRef,
    private masterService: MasterDataService,
  ) {}

  private themeObserver?: MutationObserver;

  ngOnInit(): void {
    this.selectStatus('all', false);
    this.getAllTickets();
    this.getCompanies();
    this.getDepartments();
    this.itServiceService.getSubProblem().subscribe({
      next: (res) => {
        this.subProblemList = Array.isArray(res?.data) ? res.data : [];
        this.cdr.markForCheck();
      },
      error: (error) => console.error('getSubProblem error:', error),
    });

    this.themeObserver = new MutationObserver(() => {
      setTimeout(() => {
        this.rebuildChartColors();
      }, 100);
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
  }

  private rebuildChartColors(): void {
    const textColor = this.getCssVar('--text-header') || '#0f172a';
    const mutedColor = this.getCssVar('--text-muted') || '#64748b';
    const bgCard = this.getCssVar('--bg-card') || '#ffffff';
    const borderColor = this.getCssVar('--border-color') || '#e2e8f0';

    const updateOption = (opt: any, chart?: ECharts) => {
      if (!opt) return;

      if (opt.graphic) {
        opt.graphic[0].style.fill = textColor;
        opt.graphic[1].style.fill = mutedColor;
      }

      if (opt.legend?.textStyle) {
        opt.legend.textStyle.color = textColor;
      }

      if (opt.tooltip) {
        opt.tooltip.backgroundColor = bgCard;
        opt.tooltip.borderColor = borderColor;
        if (opt.tooltip.textStyle) {
          opt.tooltip.textStyle.color = textColor;
        }
      }

      if (opt.xAxis) {
        const xAxisArr = Array.isArray(opt.xAxis) ? opt.xAxis : [opt.xAxis];

        xAxisArr.forEach((axis: any) => {
          if (axis.axisLabel) {
            axis.axisLabel.color = textColor;
          }

          if (axis.axisLine?.lineStyle) {
            axis.axisLine.lineStyle.color = borderColor;
          }
        });
      }

      // yAxis
      if (opt.yAxis) {
        const yAxisArr = Array.isArray(opt.yAxis) ? opt.yAxis : [opt.yAxis];

        yAxisArr.forEach((axis: any) => {
          if (axis.axisLabel) {
            axis.axisLabel.color = textColor;
          }

          if (axis.splitLine?.lineStyle) {
            axis.splitLine.lineStyle.color = borderColor;
          }
        });
      }

      // series label
      if (opt.series) {
        opt.series.forEach((series: any) => {
          if (series.label) {
            series.label.color = textColor;
          }
        });
      }

      chart?.setOption(opt);
    };

    updateOption(this.statusPieOption, this.statusChart);
    updateOption(this.servicePieOption, this.serviceChart);
    updateOption(this.companyBarOption, this.companyChart);
    updateOption(this.deptBarOption, this.deptChart);
    // rebuild bar chart เพราะ axisLabel color hardcode ไว้
    if (this.selectedCompany) {
      this.buildDeptBar(this.selectedCompany, this.deptTop5Map[this.selectedCompany] ?? []);
    }

    this.cdr.detectChanges();
  }

  // ====== 1) Status Donut ======

  private updateKpis(summary: any) {
    this.kpis = [
      {
        status: 'all',
        title: 'All',
        value: summary.all ?? 0,
        delta: 0,
        icon: 'fa-solid fa-border-all',
      },
      {
        status: 'done',
        title: 'Closed',
        value: summary.closed ?? 0,
        delta: 0,
        icon: 'fa-solid fa-circle-check',
      },
      {
        status: 'assigned',
        title: 'In Progress',
        value: summary.assigned ?? 0,
        delta: 0,
        icon: 'fa-solid fa-diagram-project',
      },
      {
        status: 'open',
        title: 'New',
        value: summary.open ?? 0,
        delta: 0,
        icon: 'fa-solid fa-folder-open',
      },
      {
        status: 'reopen',
        title: 'Re-Opened',
        value: summary.reopen ?? 0,
        delta: 0,
        icon: 'fa-solid fa-repeat',
      },
      {
        status: 'waitingapproval',
        title: 'Waiting Approval',
        value: summary.waitingapproval ?? 0,
        delta: 0,
        icon: 'fa-solid fa-hourglass-start',
      },
      {
        status: 'referredBack',
        title: 'Referred Back',
        value: summary.referredBack ?? 0,
        delta: 0,
        icon: 'fa-solid fa-clock-rotate-left',
      },
      {
        status: 'rejected',
        title: 'Rejected',
        value: summary.rejected ?? 0,
        delta: 0,
        icon: 'fa-solid fa-ban',
      },
      {
        status: 'denied',
        title: 'Deny',
        value: summary.denied ?? 0,
        delta: 0,
        icon: 'fa-solid fa-ban',
      },
      {
        status: 'hold',
        title: 'Hold',
        value: summary.hold ?? 0,
        delta: 0,
        icon: 'fa-solid fa-pause',
      },
    ];
  }

  private buildStatusPie(summary: any) {
    const data: PieDatum[] = [
      { name: 'In Progress', value: summary.assigned ?? 0, key: 'assigned' },
      { name: 'New', value: summary.open ?? 0, key: 'open' },
      { name: 'Re-Opened', value: summary.reopen ?? 0, key: 'reopen' },
      { name: 'Waiting Approval', value: summary.waitingapproval ?? 0, key: 'waitingapproval' },
      { name: 'Referred Back', value: summary.referredBack ?? 0, key: 'referredBack' },
      { name: 'Rejected', value: summary.rejected ?? 0, key: 'rejected' },
      { name: 'Hold', value: summary.hold ?? 0, key: 'hold' },
      { name: 'Deny', value: summary.denied ?? 0, key: 'denied' },
    ];

    const total = data.reduce((s, x) => s + x.value, 0);

    this.statusPieOption = this.makeStatusStackedBarOption(data, total);
  }
  // ====== 2) Service Donut ======
  private buildServicePie(res: any[]) {
    const allData: PieDatum[] = res.map((x, index) => ({
      name: x.name_th,
      value: Number(x.ticket_count ?? 0),
      key: String(index),
    }));
    const data = allData.filter((item) => item.value > 0);

    this.serviceDistributionLegendData = allData;
    this.serviceDistributionData = data;

    const total = data.reduce((s, x) => s + x.value, 0);

    this.servicePieOption = this.makeDonutOptionService('Service Type', data, total, 'Total');
  }
  // ====== 3) Companies Bar ======
  private remapCompanyCode(code: string): string {
    if (code === 'OTD') return 'ONEE';
    if (code === 'OTV') return 'ONE31';
    return code;
  }

  private buildCompanyBar(res: any[]) {
    const chartData = res
      .map((x) => ({
        value: Number(x.ticket_count ?? 0),
        code: this.remapCompanyCode(x.COMPANY_CODE),
        name: this.remapCompanyCode(x.COMPANY_NAME),
      }))
      .filter(
        (company) => company.code?.toUpperCase() !== 'ALL' && company.name?.toUpperCase() !== 'ALL',
      );

    this.companyDistributionData = chartData;

    const labels = chartData.map((x) => x.code);

    console.log('buildCompanyBar', chartData, labels);

    this.companyBarOption = {
      grid: { left: 18, right: 18, top: 18, bottom: 26, containLabel: true },

      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.getCssVar('--bg-card') || '#ffffff',
        textStyle: {
          color: this.getCssVar('--text-header') || '#0f172a',
        },
        formatter: (params: any) => {
          const item = params[0];
          const data = item.data;

          return `
          <div style="font-weight:700">${data.name}</div>
          <div>Tickets: ${data.value}</div>
        `;
        },
      },

      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          interval: 0,
          fontWeight: 700,
          color: this.getCssVar('--text-header') || '#0f172a',
          formatter: (value: string) => {
            const style = value.length > 6 ? 'long' : value.length > 4 ? 'medium' : 'short';
            return `{${style}|${value}}`;
          },
          rich: {
            short: { fontSize: 12, fontWeight: 700 },
            medium: { fontSize: 12, fontWeight: 700 },
            long: { fontSize: 12, fontWeight: 700 },
          },
        },
        triggerEvent: true,
      },

      media: [
        {
          query: { maxWidth: 480 },
          option: {
            tooltip: { show: false, axisPointer: { type: 'none' } },
            series: [{ type: 'bar', emphasis: { disabled: true } }],
            xAxis: {
              axisLabel: {
                rich: {
                  medium: { fontSize: 10 },
                  long: { fontSize: 8 },
                },
              },
            },
          },
        },
        {
          option: {
            tooltip: { show: true, axisPointer: { type: 'shadow' } },
            series: [{ type: 'bar', emphasis: { disabled: false } }],
            xAxis: {
              axisLabel: {
                rich: {
                  medium: { fontSize: 12 },
                  long: { fontSize: 12 },
                },
              },
            },
          },
        },
      ],

      yAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: chartData,
          barWidth: 46,
          itemStyle: { borderRadius: [12, 12, 12, 12] },
          emphasis: { focus: 'series' },
          z: 2,
          label: {
            show: true,
            position: 'top',
            fontWeight: 700,
            fontSize: 12,
            color: this.getCssVar('--text-header') || '#0f172a',
          },
        },
        {
          type: 'bar',
          barWidth: 46,
          barGap: '-100%',
          data: chartData.map((x) => ({
            ...x,
            value: Math.max(...chartData.map((d: any) => d.value)) || 1,
          })),
          itemStyle: { color: 'rgba(0,0,0,0)' },
          emphasis: { disabled: true },
          z: 3,
        },
      ],
    };

    this.selectedCompany = null;
    this.showDeptBar = true;
    this.buildDeptBar('ALL', this.deptTop5Map['ALL'] ?? []);
  }

  private buildDeptTop5Map(rows: any[]) {
    const map: Record<
      string,
      Array<{ label: string; value: number; costcent: string; companyCode: string }>
    > = {};
    const allMap: Record<
      string,
      { label: string; value: number; company: string; costcent: string; companyCode: string }
    > = {};

    for (const row of rows ?? []) {
      const companyCode = this.remapCompanyCode(row.COMPANY_CODE);
      if (!companyCode) continue;

      if (!map[companyCode]) map[companyCode] = [];
      map[companyCode].push({
        label: row.dept_display,
        value: row.ticket_count,
        costcent: row.COSTCENT,
        companyCode: row.COMPANY_CODE,
      });

      const key = `${companyCode}::${row.dept_display}`;
      if (!allMap[key]) {
        allMap[key] = {
          label: row.dept_display,
          value: 0,
          company: companyCode,
          costcent: row.COSTCENT,
          companyCode: row.COMPANY_CODE,
        };
      }
      allMap[key].value += row.ticket_count;
    }

    // map['ALL'] = Object.entries(allMap)
    //   .map(([label, { value, company }]) => ({ label: `${label} (${company})`, value }))
    //   .sort((a, b) => b.value - a.value)
    //   .slice(0, 5);

    map['ALL'] = Object.values(allMap)
      .map(({ label, value, company, costcent, companyCode }) => ({
        label: `${label} (${company})`,
        value,
        costcent,
        companyCode,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    this.deptTop5Map = map;
  }

  private makeStatusStackedBarOption(data: PieDatum[], total: number): EChartsOption {
    const colors = [
      this.getCssVar('--status-progress-text'),
      this.getCssVar('--status-open-text'),
      this.getCssVar('--status-reopen-text'),
      this.getCssVar('--status-progress-bg'),
      this.getCssVar('--status-pending-bg'),
      this.getCssVar('--status-deny-bg'),
      this.getCssVar('--status-hold-text'),
      this.getCssVar('--status-deny-text'),
    ];

    return {
      legend: {
        top: 0,
        left: 'center',
        itemWidth: 22,
        itemHeight: 10,
        itemGap: 10,
        icon: 'roundRect',
        textStyle: {
          fontSize: 10,
          color: this.getCssVar('--text-header') || '#0f172a',
        },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: this.getCssVar('--bg-card') || '#ffffff',
        textStyle: { color: this.getCssVar('--text-header') || '#0f172a' },
        formatter: (params: any) => {
          const value = Number(params?.data?.rawValue ?? 0);
          const percent = Number(params?.data?.value ?? 0);
          return `${params?.seriesName ?? ''}: ${value} (${percent.toFixed(1)}%)`;
        },
      },
      grid: { left: 12, right: 12, top: 52, bottom: 18, containLabel: false },
      xAxis: { type: 'value', max: 100, show: false },
      yAxis: { type: 'category', data: [''], show: false },
      series: data.map((item, index) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0;
        return {
          name: item.name,
          type: 'bar',
          stack: 'status-total',
          barWidth: 24,
          emphasis: { focus: 'series' },
          itemStyle: {
            color: colors[index],
            borderColor: this.getCssVar('--bg-card') || '#ffffff',
            borderWidth: 1,
          },
          label: {
            show: percent >= 4,
            position: 'inside',
            formatter: `${Math.round(percent)}%`,
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 700,
          },
          data: [{ value: percent, rawValue: item.value, key: item.key }],
        };
      }),
    };
  }

  private makeDonutOption(
    title: string,
    data: PieDatum[],
    centerValue: number,
    centerLabel: string,
  ): EChartsOption {
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
          overflow: 'truncate',
          color: this.getCssVar('--text-header') || '#0f172a',
        },
        width: '100%',
        type: 'plain',
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: this.getCssVar('--bg-card') || '#ffffff',
        textStyle: {
          color: this.getCssVar('--text-header') || '#0f172a',
        },
      },
      color: [
        this.getCssVar('--status-closed-text'),
        this.getCssVar('--status-progress-text'),
        this.getCssVar('--status-open-text'),
        this.getCssVar('--status-reopen-text'),
        this.getCssVar('--status-progress-bg'),
        this.getCssVar('--status-pending-bg'),
        this.getCssVar('--status-deny-bg'),
        this.getCssVar('--status-hold-text'),
        this.getCssVar('--status-deny-text'),
      ],
      series: [
        {
          type: 'pie',
          top: '30px',
          radius: ['55%', '82%'],
          center: ['50%', '57%'],
          label: { show: false },
          labelLine: { show: false },
          avoidLabelOverlap: true,
          emphasis: { scale: true, scaleSize: 6 },
          data,
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '57%',
          style: {
            text: String(centerValue),
            fontSize: 28,
            fontWeight: 800,
            fill:
              getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a',
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '68%',
          style: {
            text: centerLabel,
            fontSize: 12,
            fill:
              getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b',
          },
        },
      ],
    };
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
    // return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private makeDonutOptionService(
    title: string,
    data: PieDatum[],
    centerValue: number,
    centerLabel: string,
  ): EChartsOption {
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
          overflow: 'truncate',
          color: this.getCssVar('--text-header') || '#0f172a',
        },
        width: '100%',
        type: 'plain',
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: this.getCssVar('--bg-card') || '#ffffff',
        textStyle: {
          color: this.getCssVar('--text-header') || '#0f172a',
        },
      },
      color: [
        this.getCssVar('--btn-service-border'),
        this.getCssVar('--btn-repair-border'),
        this.getCssVar('--btn-problem-border'),
      ],
      series: [
        {
          type: 'pie',
          top: '30px',
          radius: ['55%', '82%'],
          center: ['50%', '57%'],
          label: { show: false },
          labelLine: { show: false },
          avoidLabelOverlap: true,
          emphasis: { scale: true, scaleSize: 6 },
          data,
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '57%',
          style: {
            text: String(centerValue),
            fontSize: 28,
            fontWeight: 800,
            fill:
              getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a',
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '68%',
          style: {
            text: centerLabel,
            fontSize: 12,
            fill:
              getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b',
          },
        },
      ],
    };
  }

  getAllTotal(): number {
    return this.kpis.find((x) => x.status.toLowerCase() === 'all')?.value ?? 0;
  }

  getPercent(k: KpiCard): number {
    const total = this.getAllTotal();
    if (k.status.toLowerCase() === 'all') return 100;
    if (!total) return 0;

    const statuses = this.kpis.filter((card) => card.status.toLowerCase() !== 'all');
    // Only balance rounding when the statuses account for all tickets.
    if (statuses.reduce((sum, card) => sum + card.value, 0) !== total) {
      return Math.round((k.value / total) * 100);
    }

    const percentages = statuses.map((card, index) => {
      const percent = (card.value / total) * 100;
      return { status: card.status, index, value: Math.floor(percent), remainder: percent % 1 };
    });
    const remaining = 100 - percentages.reduce((sum, card) => sum + card.value, 0);

    // Largest remainder method; ties follow the original card order.
    percentages.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; i < remaining; i++) {
      percentages[i].value++;
    }

    return percentages.find((card) => card.status === k.status)?.value ?? 0;
  }

  get statusDistributionKpis(): KpiCard[] {
    return this.kpis.filter(
      (card) => !['all', 'done'].includes(card.status.toLowerCase()) && card.value > 0,
    );
  }

  get statusDistributionLegendKpis(): KpiCard[] {
    return this.kpis.filter((card) => !['all', 'done'].includes(card.status.toLowerCase()));
  }

  getStatusDistributionPercent(k: KpiCard): number {
    const statuses = this.statusDistributionKpis;
    const total = statuses.reduce((sum, card) => sum + card.value, 0);
    if (!total) return 0;

    const percentages = statuses.map((card, index) => {
      const percent = (card.value / total) * 100;
      return { status: card.status, index, value: Math.floor(percent), remainder: percent % 1 };
    });
    const remaining = 100 - percentages.reduce((sum, card) => sum + card.value, 0);

    percentages.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; i < remaining; i++) percentages[i].value++;

    return percentages.find((card) => card.status === k.status)?.value ?? 0;
  }

  getServiceDistributionPercent(item: PieDatum): number {
    const total = this.serviceDistributionData.reduce((sum, service) => sum + service.value, 0);
    if (!total) return 0;

    const percentages = this.serviceDistributionData.map((service, index) => {
      const percent = (service.value / total) * 100;
      return { index, value: Math.floor(percent), remainder: percent % 1 };
    });
    const remaining = 100 - percentages.reduce((sum, service) => sum + service.value, 0);

    percentages.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; i < remaining; i++) percentages[i].value++;

    const itemIndex = this.serviceDistributionData.indexOf(item);
    return percentages.find((service) => service.index === itemIndex)?.value ?? 0;
  }

  getCompanyBarPercent(value: number): number {
    const max = Math.max(...this.companyDistributionData.map((company) => company.value), 0);
    return max > 0 ? Math.max((value / max) * 85, 2) : 0;
  }

  getDepartmentBarPercent(value: number): number {
    const max = Math.max(
      ...this.departmentDistributionData.map((department) => department.value),
      0,
    );
    return max > 0 ? Math.max((value / max) * 100, 1.5) : 0;
  }

  get departmentChartTitle(): string {
    return this.selectedCompany
      ? `Top 5 Departments - ${this.selectedCompany}`
      : 'Top 10 Departments - All Companies';
  }

  onStatusChartInit(ec: any) {
    this.statusChart = ec;
  }

  onStatusPieClick(e: any) {
    const key = e?.data?.key as StatusKey | undefined;
    if (key) this.selectStatus(key);
  }

  selectStatus(k: string, isClick: boolean = true) {
    // console.log(k, isClick);
    this.currentStatus = this.statusLabel(k);
    this.activeStatus = k;
    this.selectedStatus = k;
    if (isClick) {
      this.openTicketLogs(this.currentStatus);
    }

    this.statusChange.emit(k);

    this.highlightStatusSlice(k);
  }

  onServiceTypePieClick(e: any) {
    this.page = 1;
    this.ticketLogs = [];
    this.isLogModalVisible = true;
    const serviceType = e?.data;

    this.textClickFilter = 'serviceType';
    const serviceTypeMap: Record<string, string> = {
      แจ้งซ่อมอุปกรณ์: '1',
      แจ้งปัญหา: '2',
      ขอใช้บริการ: '3',
    };

    this.filter = {
      ...this.filter,
      dateRange: this.filterAll.dateRange,
      serviceType: serviceTypeMap[serviceType?.name],
    };

    this.filterOriginal = {
      ...this.filterOriginal,
      serviceType: serviceTypeMap[serviceType?.name],
    };

    this.loadTickets();
  }

  onDepartmentPieClick(e: any) {
    // console.log(e?.data);
    this.page = 1;
    this.ticketLogs = [];
    this.isLogModalVisible = true;
    const department = e?.data;

    this.textClickFilter = 'department';

    this.filteredDepartmentList = this.departmentList.filter(
      (d) => d.COMPANY_CODE === department.companyCode,
    );

    this.filter = {
      ...this.filter,
      dateRange: this.filterAll.dateRange,
      company: department.companyCode,
      department: department.costcent,
    };

    this.filterOriginal = {
      ...this.filterOriginal,
      company: department.companyCode,
      department: department.costcent,
    };

    this.loadTickets();
  }

  private highlightStatusSlice(k: string) {
    if (!this.statusChart) return;

    // ล้าง highlight ทุกอันก่อน
    this.statusChart.dispatchAction({ type: 'downplay' });

    const seriesIndex = this.statusIndexMap[k];
    if (seriesIndex >= 0) {
      this.statusChart.dispatchAction({
        type: 'highlight',
        seriesIndex,
        dataIndex: 0,
      });

      this.statusChart.dispatchAction({
        type: 'showTip',
        seriesIndex,
        dataIndex: 0,
      });
    } else {
      this.statusChart.dispatchAction({ type: 'hideTip' });
    }
  }

  onCompanyBarClick(e: any) {
    let company = '';

    if (e?.componentType === 'xAxis') {
      company = e.value; // click ที่ label
    } else {
      company = (e?.data?.code ?? '').toString(); // click ที่ bar
    }

    if (!company) return;

    if (this.selectedCompany === company) {
      this.selectedCompany = null;
      this.showDeptBar = true;
      this.buildDeptBar('ALL', this.deptTop5Map['ALL'] ?? []);
      return;
    }

    this.selectedCompany = company;
    this.showDeptBar = true;

    const depts = (this.deptTop5Map[company] ?? []).sort((a, b) => b.value - a.value).slice(0, 5);
    this.buildDeptBar(company, depts);
  }

  private buildDeptBar(
    company: string,
    rows: Array<{ label: string; value: number; costcent?: string; companyCode?: string }>,
  ) {
    const data = [...rows]
      .sort((a, b) => b.value - a.value)
      .slice(0, company === 'ALL' ? 10 : 5)
      .map((x) => ({
        name: x.label,
        value: x.value,
        costcent: x.costcent,
        companyCode: x.companyCode,
      }));

    this.departmentDistributionData = data;

    // console.log(rows, data);

    const labels = data.map((x) => x.name);

    const textColor =
      getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a';

    this.deptBarOption = {
      title: {
        text:
          company === 'ALL'
            ? 'Top 10 Departments - All Companies'
            : `Top 5 Departments - ${company}`,
        left: 'left',
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 800, color: textColor },
      },
      grid: { left: 16, right: 24, top: 36, bottom: 10, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.getCssVar('--bg-card') || '#ffffff',
        textStyle: {
          color: this.getCssVar('--text-header') || '#0f172a',
        },
        formatter: (params: any) => {
          const item = params?.[0];
          const row = item?.data;
          if (!row) return '';

          return `
          <div style="font-weight:700">${row.name}</div>
          <div>Tickets: ${row.value}</div>
        `;
        },
      },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLabel: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          interval: 0,
          width: 240,
          overflow: 'truncate',
          fontSize: 12,
          lineHeight: 14,
          fontWeight: 700,
          color: textColor,
        },
      },
      media: [
        {
          query: { maxWidth: 480 },
          option: {
            grid: { left: 124, right: 36, containLabel: false },
            tooltip: { show: false, axisPointer: { type: 'none' } },
            series: [{ type: 'bar', emphasis: { disabled: true } }],
            yAxis: {
              axisLabel: { width: 110, overflow: 'break', fontSize: 10, lineHeight: 12 },
            },
          },
        },
        {
          option: {
            grid: { left: 16, right: 36, containLabel: true },
            tooltip: { show: true, axisPointer: { type: 'shadow' } },
            series: [{ type: 'bar', emphasis: { disabled: false } }],
            yAxis: {
              axisLabel: { width: 240, overflow: 'truncate', fontSize: 12, lineHeight: 14 },
            },
          },
        },
      ],
      series: [
        {
          type: 'bar',
          data: data,
          barWidth: 16,
          itemStyle: { borderRadius: [10, 10, 10, 10] },
          emphasis: { focus: 'series' },
          label: {
            show: true,
            position: 'right',
            color: textColor,
            fontWeight: 700,
            fontSize: 12,
          },
        },
      ],
    };
  }

  getAllTickets() {
    const [from, to] = this.filterAll.dateRange ?? [];
    const dateFrom = from ? dayjs(from).format('YYYY-MM-DD') : undefined;
    const dateTo = to ? dayjs(to).format('YYYY-MM-DD') : undefined;

    // getAllTickets : ไม่แสดงในส่วนของขึ้นตอน Approve
    this.itServiceService.getAllTickets_real({ dateFrom, dateTo }).subscribe({
      next: (res) => {
        // console.log(res);
        this.deptTop5Map = {};
        this.deptBarOption = {};
        this.updateKpis(res.summary);
        this.buildStatusPie(res.summary);
        this.buildServicePie(res.serviceTypes);
        this.buildDeptTop5Map(res.topDepartments);
        this.buildCompanyBar(res.topCompanies);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  openTicketLogs(status: string): void {
    this.currentStatus = status;
    this.page = 1;
    this.listing.currentPage.set(0);
    this.ticketLogs = [];
    this.isLogModalVisible = true;
    this.textClickFilter = 'status';
    this.filter = {
      ...this.filter,
      dateRange: this.filterAll.dateRange,
      status: status,
    };

    this.filterOriginal = {
      ...this.filterOriginal,
      status: status,
      // dateRange: this.filterAll.dateRange,
    };
    this.loadTickets();
  }

  loadTickets(): void {
    const [dateFrom, dateTo] = this.filter.dateRange ?? [];

    const params = {
      status: this.statusLabelApi(this.filter.status),
      // status: this.statusLabelApi(this.currentStatus),
      page: this.listing.currentPage() + 1,
      pageSize: this.listing.pageSize(),
      ticketNo: this.filter.ticketNo || undefined,
      subject: this.filter.subject || undefined,
      requester: this.filter.requester || undefined,
      company: this.filter.company || undefined,
      department: this.filter.department || undefined,
      serviceType: this.filter.serviceType || undefined,
      subProblemCategoryId: this.filter.subProblemCategoryId ?? undefined,
      dateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : undefined,
      dateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : undefined,
      isReal: true,
    };
    // console.log(params);
    this.itServiceService.getTicketByStatus(params).subscribe({
      next: (res: any) => {
        // console.log(res);
        this.allRequests.set(res.data);
        this.listing.totalItems.set(res.pagination.total ?? 0);
        this.listing.totalPages.set(res.pagination.totalPages ?? 1);
        this.listing.currentPage.set((res.pagination.page ?? 1) - 1);

        this.ticketLogs = (Array.isArray(res?.data) ? res.data : []).map((t: any) => ({
          ...t,
          COMPANY_CODE: this.remapCompanyCode(t.COMPANY_CODE),
        }));
        this.filteredTicketLogs = this.ticketLogs.map((t: any) => ({
          ...t,
          assignees: t.groups_assignees_json ? JSON.parse(t.groups_assignees_json) : [],
        }));
        // console.log(this.filteredTicketLogs);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('loadTickets error:', err);
        this.ticketLogs = [];
      },
    });
  }

  clearFilter() {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filter = { ...this.filterOriginal };
    this.listing.currentPage.set(0);
    this.filteredDepartmentList = [];
    this.loadTickets();
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
    this.loadTickets();
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
    this.loadTickets();
  }

  handleCancel(): void {
    this.isLogModalVisible = false;
    this.filter = {
      status: '',
      ticketNo: '',
      subject: '',
      requester: '',
      department: '',
      company: '',
      dateRange: null,
      serviceType: '',
      subProblemCategoryId: null as number | null,
    };
    this.filterOriginal = {
      status: '',
      ticketNo: '',
      subject: '',
      requester: '',
      department: '',
      company: '',
      dateRange: null,
      serviceType: '',
      subProblemCategoryId: null as number | null,
    };
    this.ticketLogs = [];
    this.page = 1;
    this.textClickFilter = '';
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
      case 'open':
        return 'New';
      case 'reopen':
        return 'ReOpened';
      case 'assigned':
        return 'In Progress';
      // case 'inprogress':
      //   return 'In Progress';
      case 'done':
        return 'Closed';
      case 'denied':
        return 'Denied';
      case 'hold':
        return 'Hold';
      case 'waitingapproval':
        return 'Waiting Approval';
      case 'referredBack':
        return 'Referred Back';
      case 'rejected':
        return 'Rejected';
      case 'all':
        return 'All';
      default:
        return this.currentStatus;
    }
  }

  statusLabelApi(status: string) {
    switch (status) {
      case 'In Progress':
        return 'Assigned';
      case 'New':
        return 'Open';
      default:
        return status || 'All';
    }
  }

  private filterTimer: ReturnType<typeof setTimeout> | null = null;
  applyFilter() {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.listing.currentPage.set(0);
    this.filterTimer = setTimeout(() => {
      this.loadTickets();
    }, 300);
  }

  filterAll = {
    dateRange: [dayjs().startOf('year').toDate(), dayjs().endOf('year').toDate()] as
      [Date, Date] | null,
  };
  quickRange = 'year';

  applyFilterAll() {
    // console.log(this.filterAll.dateRange);
    this.getAllTickets();
  }

  onStartDateChange(date: Date): void {
    const endDate = this.filterAll.dateRange?.[1] ?? date;
    this.filterAll.dateRange = [date, endDate];
    this.quickRange = '';
    this.applyFilterAll();
  }

  onEndDateChange(date: Date): void {
    const startDate = this.filterAll.dateRange?.[0] ?? date;
    this.filterAll.dateRange = [startDate, date];
    this.quickRange = '';
    this.applyFilterAll();
  }

  onQuickRangeChange(range: string): void {
    const today = dayjs();
    let startDate = today;
    let endDate = today;

    switch (range) {
      case '7days':
        startDate = today.subtract(6, 'day');
        break;
      case '15days':
        startDate = today.subtract(14, 'day');
        break;
      case '30days':
        startDate = today.subtract(29, 'day');
        break;
      case '90days':
        startDate = today.subtract(89, 'day');
        break;
      case 'year':
        startDate = today.startOf('year');
        endDate = today.endOf('year');
        break;
      case 'today':
      default:
        break;
    }

    this.filterAll.dateRange = [startDate.toDate(), endDate.toDate()];
    this.applyFilterAll();
  }

  resetFilter() {
    this.filterAll = {
      dateRange: null,
    };
  }

  export() {
    const [from, to] = this.filterAll.dateRange ?? [];
    const dateFrom = dayjs(from).format('YYYY-MM-DD');
    const dateTo = dayjs(to).format('YYYY-MM-DD');

    this.isExporting = true;
    this.itServiceService.exportTicket({ dateFrom, dateTo }).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tickets_${dateFrom}_${dateTo}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.isExporting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Export failed:', error);
        this.isExporting = false;
        this.cdr.detectChanges();
      },
    });
  }

  exportData() {
    const [dateFrom, dateTo] = this.filter.dateRange ?? [];
    const params = {
      status: this.statusLabelApi(this.filter.status),
      page: 1,
      pageSize: Math.max(this.listing.totalItems(), 1),
      ticketNo: this.filter.ticketNo || undefined,
      subject: this.filter.subject || undefined,
      requester: this.filter.requester || undefined,
      company: this.filter.company || undefined,
      department: this.filter.department || undefined,
      serviceType: this.filter.serviceType || undefined,
      subProblemCategoryId: this.filter.subProblemCategoryId ?? undefined,
      dateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : undefined,
      dateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : undefined,
      isReal: true,
    };

    this.isExporting = true;
    this.itServiceService.getTicketByStatus(params).subscribe({
      next: (response: any) => {
        const tickets = (Array.isArray(response?.data) ? response.data : []).map((ticket: any) => ({
          ...ticket,
          COMPANY_CODE: this.remapCompanyCode(ticket.COMPANY_CODE),
        }));
        if (!tickets.length) {
          this.isExporting = false;
          this.cdr.detectChanges();
          return;
        }

        const headText =
          this.textClickFilter === 'serviceType'
            ? tickets[0]?.name_th
            : this.textClickFilter === 'department'
              ? `${tickets[0]?.deptName ?? ''} (${tickets[0]?.COMPANY_CODE ?? ''})`
              : this.textClickFilter === 'status'
                ? this.filter.status
                : 'all';
        const safeHead = String(headText || 'all').replace(/[\\/:*?"<>|]/g, '-');
        const fromText = dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : 'all';
        const toText = dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : 'all';
        exportTicketLogsToExcel(tickets, `tickets_${safeHead}_${fromText}_${toText}.xlsx`);
        this.isExporting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Export tickets error:', error);
        this.isExporting = false;
        this.cdr.detectChanges();
      },
    });
  }

  exportData_old() {
    const [dateFrom, dateTo] = this.filter.dateRange ?? [];

    const params = {
      status: this.statusLabelApi(this.filter.status),
      page: this.listing.currentPage() + 1,
      pageSize: this.listing.pageSize(),
      ticketNo: this.filter.ticketNo || undefined,
      subject: this.filter.subject || undefined,
      requester: this.filter.requester || undefined,
      company: this.filter.company || undefined,
      department: this.filter.department || undefined,
      serviceType: this.filter.serviceType || undefined,
      subProblemCategoryId: this.filter.subProblemCategoryId ?? undefined,
      dateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : undefined,
      dateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : undefined,
      isReal: true,
    };
    // console.log(params, this.filteredTicketLogs);

    const head_text =
      this.textClickFilter === 'serviceType'
        ? this.filteredTicketLogs[0]?.name_th
        : this.textClickFilter === 'department'
          ? this.filteredTicketLogs[0]?.deptName +
            ' (' +
            this.filteredTicketLogs[0]?.COMPANY_CODE +
            ')'
          : this.textClickFilter === 'status'
            ? this.filter.status
            : '';

    this.itServiceService.exportTicketByStatus(params).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tickets_${head_text}_${dayjs(dateFrom).format('YYYY-MM-DD')}_${dayjs(dateTo).format('YYYY-MM-DD')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('loadTickets error:', err);
        this.ticketLogs = [];
      },
    });
  }

  getAssignedMembers(members: any[]): any[] {
    return members?.filter((m) => m.is_assigned === 1) ?? [];
  }

  getAssignedNames(members: any[]): string {
    return members
      .filter((m) => m.is_assigned === 1)
      .map((m) => `${m.assigned_name}`)
      .join('\n');
  }

  // GET MASTER
  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
        this.companyList = data.map((c: any) => ({
          ...c,
          COMPANY_CODE: c.COMPANY_CODE,
          COMPANY_CODE_DISPLAY: this.remapCompanyCode(c.COMPANY_CODE),
          COMPANY_NAME: c.COMPANY_NAME,
        }));
        // console.log(this.companyList);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  getDepartments() {
    this.masterService.getDepartmentMaster().subscribe({
      next: (data) => {
        this.departmentList = data.map((d: any) => ({
          ...d,
          COMPANY_CODE: d.COMPANY_CODE,
        }));
        // console.log(this.departmentList);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  onCompanyChange() {
    this.filter.department = '';

    if (!this.filter.company) {
      this.filteredDepartmentList = [];
      return;
    }

    this.filteredDepartmentList = this.departmentList.filter(
      (d) => d.COMPANY_CODE === this.filter.company,
    );

    this.applyFilter();
  }

  private serviceChart?: ECharts;
  private companyChart?: ECharts;
  private deptChart?: ECharts;

  onServiceChartInit(ec: any) {
    this.serviceChart = ec;
  }
  onCompanyChartInit(ec: any) {
    this.companyChart = ec;
  }
  onDeptChartInit(ec: any) {
    this.deptChart = ec;
  }

  private applyLightModeForExport(): void {
    const text = '#0f172a';
    const muted = '#64748b';
    const bg = '#ffffff';

    // Partial setOption — เฉพาะสี ไม่แตะ label.show
    // graphic top ปรับให้ตรงกับ center ['50%','55%'] ที่ใช้ตอน export (canvas 420px, series top 30px)
    const pieColors = {
      legend: { textStyle: { color: text } },
      tooltip: { backgroundColor: bg, textStyle: { color: text } },
      graphic: [
        { top: '53%', style: { fill: text } },
        { top: '64%', style: { fill: muted } },
      ],
      series: [{ label: { color: text } }],
    };
    this.statusChart?.setOption({
      legend: { textStyle: { color: text } },
      tooltip: { backgroundColor: bg, textStyle: { color: text } },
    });
    this.serviceChart?.setOption(pieColors);

    this.companyChart?.setOption({
      tooltip: { backgroundColor: bg, textStyle: { color: text } },
      xAxis: { axisLabel: { color: text } },
      series: [{ label: { color: text } }, {}],
    });

    this.deptChart?.setOption({
      title: { textStyle: { color: text } },
      tooltip: { backgroundColor: bg, textStyle: { color: text } },
      yAxis: { axisLabel: { color: text } },
      series: [{ label: { color: text } }],
    });
  }

  async exportCharts() {
    this.isExporting = true;
    this.cdr.detectChanges();

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const canvas = this.createChartsExportCanvas();

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `dashboard_charts_${dayjs().format('YYYYMMDD_HHmmss')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export charts error:', error);
    } finally {
      this.isExporting = false;
      this.cdr.detectChanges();
    }
  }

  private createChartsExportCanvas(): HTMLCanvasElement {
    const width = 1400;
    const padding = 28;
    const gap = 18;
    const exportDepartments = (this.deptTop5Map['ALL'] ?? [])
      .slice(0, 10)
      .map((item) => ({ name: item.label, value: item.value }));
    const kpiHeight = 206;
    const statusHeight = 170;
    const serviceHeight = 170;
    const companyHeight = 330;
    const departmentHeight = 78 + Math.max(exportDepartments.length, 1) * 34;
    const height =
      padding * 2 +
      kpiHeight +
      statusHeight +
      serviceHeight +
      companyHeight +
      departmentHeight +
      gap * 4;
    const pixelRatio = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(pixelRatio, pixelRatio);

    const cardWidth = width - padding * 2;
    const textColor = '#334155';
    const mutedColor = '#64748b';
    const borderColor = '#e2e8f0';
    const trackColor = '#e7eef8';
    const primaryColor = this.getCssVar('--primary') || '#1a73e8';

    const roundedRect = (x: number, y: number, w: number, h: number, radius: number) => {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };
    const drawCard = (title: string, y: number, h: number) => {
      ctx.fillStyle = '#ffffff';
      roundedRect(padding, y, cardWidth, h, 16);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.font = "800 16px Inter, 'IBM Plex Sans Thai Looped', Arial, sans-serif";
      ctx.fillText(title, padding + 20, y + 30);
    };
    const fitText = (text: string, maxWidth: number) => {
      if (ctx.measureText(text).width <= maxWidth) return text;
      let result = text;
      while (result.length && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
      return `${result}…`;
    };
    const statusColor = (status: string) => {
      const colors: Record<string, string> = {
        assigned: this.getCssVar('--status-progress-text') || '#d97706',
        done: this.getCssVar('--status-closed-text') || '#229b4f',
        open: this.getCssVar('--status-new-text') || '#2563eb',
        reopen: this.getCssVar('--status-reopen-text') || '#0ea5e9',
        waitingapproval: this.getCssVar('--status-waiting-approval-text') || '#0f9488',
        referredBack: this.getCssVar('--status-referred-back-text') || '#a16207',
        rejected: this.getCssVar('--status-rejected-text') || '#8b5cf6',
        denied: this.getCssVar('--status-deny-text') || '#dc2626',
        hold: this.getCssVar('--status-hold-text') || '#616161',
        all: this.getCssVar('--text-table-head') || '#64748b',
      };
      return colors[status] || mutedColor;
    };
    const kpiCardBackground = (status: string) => {
      const colors: Record<string, string> = {
        waitingapproval:
          this.getCssVar('--status-waiting-approval-bg') || 'rgba(20, 184, 166, 0.15)',
        referredBack:
          this.getCssVar('--status-referred-back-bg') || 'rgba(234, 179, 8, 0.18)',
        rejected: this.getCssVar('--status-rejected-bg') || 'rgba(139, 92, 246, 0.15)',
      };
      return colors[status] || '#ffffff';
    };
    const kpiIconBackground = (status: string) => {
      const colors: Record<string, string> = {
        done: this.getCssVar('--status-closed-bg') || 'rgba(47, 185, 142, 0.15)',
        assigned: this.getCssVar('--status-progress-bg') || 'rgba(255, 152, 34, 0.15)',
        open: this.getCssVar('--status-new-bg') || 'rgba(14, 165, 233, 0.15)',
        reopen: this.getCssVar('--status-reopen-bg') || 'rgba(37, 100, 235, 0.15)',
        waitingapproval:
          this.getCssVar('--status-waiting-approval-bg') || 'rgba(20, 184, 166, 0.15)',
        referredBack:
          this.getCssVar('--status-referred-back-bg') || 'rgba(234, 179, 8, 0.18)',
        rejected: this.getCssVar('--status-rejected-bg') || 'rgba(139, 92, 246, 0.15)',
        denied: this.getCssVar('--status-deny-bg') || 'rgba(220, 38, 38, 0.15)',
        hold: this.getCssVar('--status-hold-bg') || 'rgba(141, 141, 141, 0.15)',
      };
      return colors[status] || '#f1f5f9';
    };
    const serviceColor = (key?: string) => {
      const colors = [
        this.getCssVar('--btn-service-border') || '#3b82f6',
        this.getCssVar('--btn-repair-border') || '#f43f5e',
        this.getCssVar('--btn-problem-border') || '#f59e0b',
      ];
      return colors[Number(key ?? 0)] || primaryColor;
    };
    const drawStackedBar = <T extends { name: string; value: number; color: string }>(
      data: T[],
      legend: T[],
      y: number,
    ) => {
      const x = padding + 20;
      const barY = y + 58;
      const barWidth = cardWidth - 40;
      const barHeight = 28;
      const total = data.reduce((sum, item) => sum + item.value, 0);
      let currentX = x;
      for (const item of data) {
        const segmentWidth = total ? (item.value / total) * barWidth : 0;
        ctx.fillStyle = item.color;
        ctx.fillRect(currentX, barY, segmentWidth, barHeight);
        const percent = total ? Math.round((item.value / total) * 100) : 0;
        if (segmentWidth >= 26) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 11px Arial, sans-serif';
          ctx.textAlign = 'center';
          const label = segmentWidth >= 125 ? `${item.name} ${percent}%` : `${percent}%`;
          ctx.fillText(label, currentX + segmentWidth / 2, barY + 18);
        }
        currentX += segmentWidth;
      }
      ctx.textAlign = 'left';
      let legendX = x;
      let legendY = barY + 55;
      ctx.font = '11px Arial, sans-serif';
      for (const item of legend) {
        const itemWidth = 24 + ctx.measureText(item.name).width;
        if (legendX + itemWidth > x + barWidth) {
          legendX = x;
          legendY += 22;
        }
        ctx.fillStyle = item.color;
        roundedRect(legendX, legendY - 8, 15, 8, 3);
        ctx.fill();
        ctx.fillStyle = mutedColor;
        ctx.fillText(item.name, legendX + 21, legendY);
        legendX += itemWidth + 18;
      }
    };

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    let y = padding;
    const kpiGap = 14;
    const kpiColumns = 5;
    const kpiCardWidth = (cardWidth - kpiGap * (kpiColumns - 1)) / kpiColumns;
    const kpiCardHeight = 96;
    for (let index = 0; index < this.kpis.length; index++) {
      const item = this.kpis[index];
      const column = index % kpiColumns;
      const row = Math.floor(index / kpiColumns);
      const cardX = padding + column * (kpiCardWidth + kpiGap);
      const cardY = y + row * (kpiCardHeight + kpiGap);
      const color = statusColor(item.status);
      ctx.fillStyle = kpiCardBackground(item.status);
      roundedRect(cardX, cardY, kpiCardWidth, kpiCardHeight, 14);
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = mutedColor;
      ctx.font = "600 12px Inter, 'IBM Plex Sans Thai Looped', Arial, sans-serif";
      ctx.fillText(item.title, cardX + 14, cardY + 24);

      ctx.fillStyle = kpiIconBackground(item.status);
      roundedRect(cardX + kpiCardWidth - 42, cardY + 13, 28, 28, 8);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cardX + kpiCardWidth - 28, cardY + 27, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.font = '800 25px Arial, sans-serif';
      ctx.fillText(String(item.value), cardX + 14, cardY + 70);
      const valueWidth = ctx.measureText(String(item.value)).width;
      const percent = this.getPercent(item);
      const percentText = `${percent}%`;
      ctx.font = '600 10px Arial, sans-serif';
      const percentWidth = ctx.measureText(percentText).width + 12;
      ctx.fillStyle = '#f1f5f9';
      roundedRect(cardX + 20 + valueWidth, cardY + 53, percentWidth, 20, 7);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(percentText, cardX + 26 + valueWidth, cardY + 67);
    }

    y += kpiHeight + gap;
    drawCard('Status Distribution', y, statusHeight);
    drawStackedBar(
      this.statusDistributionKpis.map((item) => ({
        name: item.title,
        value: item.value,
        color: statusColor(item.status),
      })),
      this.statusDistributionLegendKpis.map((item) => ({
        name: item.title,
        value: item.value,
        color: statusColor(item.status),
      })),
      y,
    );

    y += statusHeight + gap;
    drawCard('Service Type', y, serviceHeight);
    drawStackedBar(
      this.serviceDistributionData.map((item) => ({
        name: item.name,
        value: item.value,
        color: serviceColor(item.key),
      })),
      this.serviceDistributionLegendData.map((item) => ({
        name: item.name,
        value: item.value,
        color: serviceColor(item.key),
      })),
      y,
    );

    y += serviceHeight + gap;
    drawCard('Companies', y, companyHeight);
    const companyInnerX = padding + 20;
    const companyInnerWidth = cardWidth - 40;
    const companyMax = Math.max(...this.companyDistributionData.map((item) => item.value), 1);
    const companyCount = Math.max(this.companyDistributionData.length, 1);
    const companyGap = 10;
    const companyCellWidth = (companyInnerWidth - companyGap * (companyCount - 1)) / companyCount;
    const companyBaseY = y + companyHeight - 42;
    for (let index = 0; index < this.companyDistributionData.length; index++) {
      const item = this.companyDistributionData[index];
      const cellX = companyInnerX + index * (companyCellWidth + companyGap);
      ctx.strokeStyle = borderColor;
      roundedRect(cellX, y + 48, companyCellWidth, companyHeight - 66, 10);
      ctx.stroke();
      const barHeight = Math.max((item.value / companyMax) * 190, 3);
      const barWidth = Math.min(44, companyCellWidth * 0.42);
      const barX = cellX + (companyCellWidth - barWidth) / 2;
      const barY = companyBaseY - 22 - barHeight;
      ctx.fillStyle = primaryColor;
      roundedRect(barX, barY, barWidth, barHeight, Math.min(10, barWidth / 2));
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.font = '800 11px Arial, sans-serif';
      ctx.fillText(String(item.value), cellX + companyCellWidth / 2, barY - 7);
      ctx.fillText(fitText(item.code, companyCellWidth - 8), cellX + companyCellWidth / 2, companyBaseY);
    }
    ctx.textAlign = 'left';

    y += companyHeight + gap;
    drawCard('Top 10 Departments - All Companies', y, departmentHeight);
    const departmentLabelWidth = 360;
    const departmentBarX = padding + 20 + departmentLabelWidth;
    const departmentBarWidth = cardWidth - 76 - departmentLabelWidth;
    const departmentMax = Math.max(...exportDepartments.map((item) => item.value), 1);
    ctx.font = "700 11px Inter, 'IBM Plex Sans Thai Looped', Arial, sans-serif";
    for (let index = 0; index < exportDepartments.length; index++) {
      const item = exportDepartments[index];
      const rowY = y + 62 + index * 34;
      ctx.fillStyle = textColor;
      ctx.fillText(fitText(item.name, departmentLabelWidth - 22), padding + 20, rowY + 11);
      ctx.fillStyle = trackColor;
      roundedRect(departmentBarX, rowY, departmentBarWidth, 16, 8);
      ctx.fill();
      ctx.fillStyle = primaryColor;
      roundedRect(departmentBarX, rowY, Math.max((item.value / departmentMax) * departmentBarWidth, 4), 16, 8);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.fillText(String(item.value), width - padding - 20, rowY + 12);
      ctx.textAlign = 'left';
    }

    return canvas;
  }

  private async exportChartsLegacy() {
    this.isExporting = true;
    this.cdr.detectChanges();
    await new Promise((r) => setTimeout(r, 50)); // รอให้ loading render ก่อน

    const PIE_EXPORT = { width: 540, height: 420 };
    const BAR_EXPORT = { width: 540, height: 340 };

    // บันทึก original size ก่อน resize
    const getSize = (chart: ECharts | undefined) => {
      const dom = (chart as any)?.getDom() as HTMLElement | undefined;
      return { width: dom?.offsetWidth ?? 0, height: dom?.offsetHeight ?? 0 };
    };
    const origStatusSize = getSize(this.statusChart);
    const origServiceSize = getSize(this.serviceChart);
    const origCompanySize = getSize(this.companyChart);
    const origDeptSize = getSize(this.deptChart);

    // Resize chart ก่อน export เพื่อให้มีพื้นที่สำหรับ label
    this.statusChart?.resize(BAR_EXPORT);
    this.serviceChart?.resize(PIE_EXPORT);
    this.companyChart?.resize(BAR_EXPORT);
    this.deptChart?.resize(BAR_EXPORT);

    const pieExportLabel = {
      series: [
        {
          label: { show: true, formatter: '{b}: {c}', fontSize: 10, color: '#0f172a' },
          labelLine: { show: true, length: 12, length2: 8, smooth: true },
          avoidLabelOverlap: true,
          minShowLabelAngle: 2,
          labelLayout: { moveOverlap: 'shiftY', margin: 5 },
        },
      ],
    };

    this.serviceChart?.setOption(pieExportLabel);

    // ย่อ radius ให้ label มีพื้นที่โผล่รอบวง ไม่ถูก clip
    this.serviceChart?.setOption({ series: [{ radius: ['40%', '62%'], center: ['50%', '55%'] }] });

    this.companyChart?.setOption({
      series: [
        { label: { show: true, position: 'top', fontSize: 11, color: '#333', fontWeight: 'bold' } },
      ],
    });

    this.applyLightModeForExport();

    await new Promise((r) => setTimeout(r, 600));

    const charts = [
      { chart: this.statusChart, name: 'Status Distribution', size: BAR_EXPORT },
      { chart: this.serviceChart, name: 'Service Type', size: PIE_EXPORT },
      { chart: this.companyChart, name: 'Companies', size: BAR_EXPORT },
      { chart: this.deptChart, name: 'Top 5 Departments', size: BAR_EXPORT },
    ];

    const validCharts = charts.filter((c) => !!c.chart);
    if (validCharts.length === 0) return;

    const cols = 2;
    const padding = 20;
    const titleH = 30;
    const rows = Math.ceil(validCharts.length / cols);
    const colW = Math.max(...validCharts.map((c) => c.size.width));
    const rowH = Math.max(...validCharts.map((c) => c.size.height));
    const totalW = cols * colW + (cols + 1) * padding;
    const totalH = rows * (rowH + titleH) + (rows + 1) * padding;

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    for (let i = 0; i < validCharts.length; i++) {
      const { chart, name, size } = validCharts[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (colW + padding);
      const y = padding + row * (rowH + titleH + padding);

      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(name, x, y + 18);

      const url = chart!.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x, y + titleH, size.width, size.height);
          resolve();
        };
        img.src = url;
      });
    }

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'dashboard_charts.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Restore label, resize กลับขนาด container เดิม และ restore สีตาม theme ปัจจุบัน
    this.serviceChart?.setOption({
      series: [{ label: { show: false }, labelLine: { show: false } }],
    });
    this.companyChart?.setOption({
      series: [
        {
          label: {
            show: true,
            position: 'top',
            fontWeight: 700,
            fontSize: 12,
            color: this.getCssVar('--text-header') || '#0f172a',
          },
        },
      ],
    });

    this.statusChart?.resize(origStatusSize);
    this.serviceChart?.resize(origServiceSize);
    this.companyChart?.resize(origCompanySize);
    this.deptChart?.resize(origDeptSize);

    this.rebuildChartColors();

    this.isExporting = false;
    this.cdr.detectChanges();
  }
}

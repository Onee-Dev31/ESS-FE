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
type PieDatum = { name: string; value: number; key?: string };

@Component({
  selector: 'app-it-dashboard-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NgxEchartsDirective, NgxEchartsModule],
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

  constructor(
    private itServiceService: ItServiceService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.selectStatus('all');
    this.getAllTickets();

  }

  // mock: top 5 dept ต่อ company (ต่อ API ทีหลังได้)
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
        status: 'all',
        title: 'All Tickets',
        value: summary.all ?? 0,
        delta: 0,
        hint: 'Tickets ทั้งหมดทุกสถานะ',
        icon: 'appstore'
      }
    ];
  }
  private buildStatusPie(summary: any) {

    const data: PieDatum[] = [
      { name: 'Open', value: summary.open ?? 0, key: 'open' },
      { name: 'Assigned', value: summary.assigned ?? 0, key: 'assigned' },
      { name: 'In Progress', value: summary.inProcess ?? 0, key: 'inprogress' },
      { name: 'Closed', value: summary.closed ?? 0, key: 'done' }
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
    console.log("firstCompany : ", firstCompany);

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

  // ===== Helper: donut option (ใช้ร่วมกัน 2 pie) =====
  private makeDonutOption(title: string, data: PieDatum[], centerValue: number, centerLabel: string): EChartsOption {
    return {
      legend: {
        top: -5,
        left: 'center',
        orient: 'horizontal',
        itemWidth: 18,
        itemHeight: 10,
        icon: 'roundRect',
        textStyle: {
          fontSize: 10,
          fontWeight: 400,
          overflow: 'truncate'   // กันข้อความยาวเกิน
        },
        width: '100%',            // 👈 บังคับความกว้าง
        type: 'plain',
      },
      tooltip: { trigger: 'item' },
      color: ['#2563eb', '#0ea5e9', '#f97316', '#22c55e'], // 👈 ใส่ตรงนี้
      series: [
        {
          type: 'pie',
          radius: ['55%', '82%'],
          center: ['50%', '56%'],
          label: { show: false },
          labelLine: { show: false },
          avoidLabelOverlap: true,
          emphasis: { scale: true, scaleSize: 8 },
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

  private makeDonutOptionService(title: string, data: PieDatum[], centerValue: number, centerLabel: string): EChartsOption {
    return {
      legend: {
        top: -5,
        left: 'center',
        orient: 'horizontal',
        itemWidth: 18,
        itemHeight: 10,
        icon: 'roundRect',
        textStyle: {
          fontSize: 10,
          fontWeight: 400,
          overflow: 'truncate'   // กันข้อความยาวเกิน
        },
        width: '100%',            // 👈 บังคับความกว้าง
        type: 'plain',
      },
      tooltip: { trigger: 'item' },
      color: ['#3b82f6', '#f43f5e', '#f59e0b'], // 👈 ใส่ตรงนี้
      series: [
        {
          type: 'pie',
          radius: ['55%', '82%'],
          center: ['50%', '56%'],
          label: { show: false },
          labelLine: { show: false },
          avoidLabelOverlap: true,
          emphasis: { scale: true, scaleSize: 8 },
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

    // ✅ ตอนเริ่มถ้าอยากให้ all (ไม่ highlight อะไร) ก็แค่ลงค่า center total
    this.applyStatusCenter('all');
  }

  onStatusPieClick(e: any) {
    const key = e?.data?.key as StatusKey | undefined;
    if (key) this.selectStatus(key);
  }

  selectStatus(k: string) {
    this.activeStatus = k;
    this.selectedStatus = k;
    this.statusChange.emit(k);

    // ✅ ทำ effect เหมือน hover/active
    this.highlightStatusSlice(k);

    // ✅ ปรับข้อความกลางวง (จะเอา total ตอน all, เอาค่าตาม slice ตอนเลือก)
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

      // optional: ให้ tooltip โผล่ด้วยเหมือน hover
      this.statusChart.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex
      });
    } else {
      // all -> ซ่อน tooltip
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

    // ✅ update graphic text แล้ว setOption แบบไม่กระพริบ
    const opt = this.statusPieOption as any;
    opt.graphic = [
      { type: 'text', left: 'center', top: '46%', style: { text: String(centerValue), fontSize: 28, fontWeight: 800, fill: getComputedStyle(document.body).getPropertyValue('--text-header').trim() || '#0f172a' } },
      { type: 'text', left: 'center', top: '58%', style: { text: centerLabel, fontSize: 12, fill: getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b' } }
    ];

    this.statusChart?.setOption(opt, { notMerge: false, lazyUpdate: true });
  }

  onCompanyBarClick(e: any) {
    console.log("company : ", e);
    // e.name จะเป็น label ของ category เช่น 'ONEE'
    const company = (e?.data.code ?? '').toString();
    if (!company) return;
    console.log("company : ", company);

    // toggle: คลิกซ้ำ = ซ่อน
    // if (this.selectedCompany === company && this.showDeptBar) {
    //   this.showDeptBar = false;
    //   this.selectedCompany = null;
    //   return;
    // }

    this.selectedCompany = company;
    this.showDeptBar = true;

    // สร้างกราฟ top 5 dept
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
        console.log(res);
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
}
import { Component, EventEmitter, Output } from '@angular/core';
import { ChartMode, KpiCard, StatusKey } from '../../../interfaces/it-dashboard.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NgxEchartsDirective, NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import type { ECharts } from 'echarts'; // ✅ ไม่ใช้ EChartsType
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
  @Output() statusChange = new EventEmitter<StatusKey | null>();

  // ===== KPI =====
  activeStatus: StatusKey = 'all';
  selectedStatus: StatusKey = 'all';
  kpis: KpiCard[] = [
    { key: 'open', title: 'Open tickets', value: 52, delta: 0, hint: 'Tickets ใหม่ทั้งหมดที่มีการเปิดมา', icon: 'inbox' },
    { key: 'assigned', title: 'Assigned Tickets', value: 36, delta: 0, hint: 'Tickets ที่ได้รับมอบหมาย', icon: 'user' },
    { key: 'inprocess', title: 'In Process Tickets', value: 41, delta: 0, hint: 'Tickets ที่กำลังดำเนินการ', icon: 'sync' },
    { key: 'done', title: 'Closed Tickets', value: 45, delta: 0, hint: 'Tickets ที่ปิดแล้ว', icon: 'check-circle' },
    { key: 'all', title: 'All Tickets', value: 174, delta: 0, hint: 'Tickets ทั้งหมดทุกสถานะ', icon: 'appstore' }
  ];

  trackByKey = (_: number, x: KpiCard) => x.key;
  // ===== ECharts Options =====
  statusPieOption!: EChartsOption;
  servicePieOption!: EChartsOption;
  companyBarOption!: EChartsOption;
  private statusChart?: ECharts;

  // map key -> index ใน pie (ต้องตรงกับ data ที่ใส่ใน option)
  private statusIndexMap: Record<StatusKey, number> = {
    open: 0,
    assigned: 1,
    inprocess: 2,
    done: 3,
    all: -1
  };
  ngOnInit(): void {
    // ✅ init default filter
    this.selectStatus('all');

    // ✅ build charts
    this.buildStatusPie();
    this.buildServicePie();
    this.buildCompanyBar();
  }

  // ====== 1) Status Donut ======
  private buildStatusPie() {
    const data: PieDatum[] = [
      { name: 'Open', value: 52, key: 'open' },
      { name: 'Assigned', value: 36, key: 'assigned' },
      { name: 'In Process', value: 41, key: 'inprocess' },
      { name: 'Closed', value: 45, key: 'done' }
    ];
    const total = data.reduce((s, x) => s + x.value, 0);

    this.statusPieOption = this.makeDonutOption('Status Distribution', data, total, 'Total');
  }
  // ====== 2) Service Donut ======
  private buildServicePie() {
    const data: PieDatum[] = [
      { name: 'ขอใช้บริการ', value: 120 },
      { name: 'แจ้งซ่อม', value: 80 },
      { name: 'แจ้งปัญหา', value: 60 }
    ];
    const total = data.reduce((s, x) => s + x.value, 0);

    this.servicePieOption = this.makeDonutOption('Service Type', data, total, 'Total');
  }

  // ====== 3) Top Companies Bar ======
  private buildCompanyBar() {
    const labels = ['ONEE', 'GTV', 'FLD', 'ARTS'];
    const values = [120, 85, 60, 40];

    this.companyBarOption = {
      grid: { left: 18, right: 18, top: 18, bottom: 26, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontWeight: 700 }
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
          data: values,
          barWidth: 46,
          // สีไม่กำหนดก็ได้ แต่ถ้าชอบโทนเดิม:
          itemStyle: { borderRadius: [12, 12, 12, 12] },
          emphasis: { focus: 'series' }
        }
      ]
    };
  }

  // ===== Helper: donut option (ใช้ร่วมกัน 2 pie) =====
  private makeDonutOption(title: string, data: PieDatum[], centerValue: number, centerLabel: string): EChartsOption {
    return {
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
          style: { text: String(centerValue), fontSize: 28, fontWeight: 800 }
        },
        {
          type: 'text',
          left: 'center',
          top: '58%',
          style: { text: centerLabel, fontSize: 12, fill: '#64748b' }
        }
      ]
    };
  }
  getAllTotal(): number {
    return this.kpis.find(x => x.key === 'all')?.value ?? 0;
  }

  getPercent(k: KpiCard): number {
    const total = this.getAllTotal();
    if (!total || k.key === 'all') return 100;
    return Math.round((k.value / total) * 100); // หรือ toFixed(1) ก็ได้
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

  selectStatus(k: StatusKey) {
    this.activeStatus = k;
    this.selectedStatus = k;
    this.statusChange.emit(k);

    // ✅ ทำ effect เหมือน hover/active
    this.highlightStatusSlice(k);

    // ✅ ปรับข้อความกลางวง (จะเอา total ตอน all, เอาค่าตาม slice ตอนเลือก)
    this.applyStatusCenter(k);
  }

  private highlightStatusSlice(k: StatusKey) {
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

  private applyStatusCenter(k: StatusKey) {
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
      { type: 'text', left: 'center', top: '46%', style: { text: String(centerValue), fontSize: 28, fontWeight: 800 } },
      { type: 'text', left: 'center', top: '58%', style: { text: centerLabel, fontSize: 12, fill: '#64748b' } }
    ];

    this.statusChart?.setOption(opt, { notMerge: false, lazyUpdate: true });
  }
}

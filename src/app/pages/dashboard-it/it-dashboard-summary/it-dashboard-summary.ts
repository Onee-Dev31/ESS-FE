import { Component } from '@angular/core';
import { ChartMode, KpiCard, StatusKey } from '../../../interfaces/it-dashboard.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-it-dashboard-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule],
  templateUrl: './it-dashboard-summary.html',
  styleUrl: './it-dashboard-summary.scss',
})
export class ItDashboardSummary {
  // ===== KPI =====
  activeStatus: StatusKey = 'all';

  kpis: KpiCard[] = [
    { key: 'open', title: 'Open tickets', value: 52, delta: 15, hint: 'Tickets ใหม่ทั้งหมดที่มีการเปิดมา', icon: 'inbox' },
    { key: 'assigned', title: 'Assigned Tickets', value: 36, delta: 11, hint: 'Tickets ที่ได้รับมอบหมาย', icon: 'user' },
    { key: 'inprocess', title: 'In Process Tickets', value: 41, delta: 15, hint: 'Tickets ที่กำลังดำเนินการ', icon: 'sync' },
    { key: 'closed', title: 'Closed Tickets', value: 45, delta: 10, hint: 'Tickets ที่ปิดแล้ว', icon: 'check-circle' },
    { key: 'all', title: 'All Tickets', value: 174, delta: 12, hint: 'Tickets ทั้งหมดทุกสถานะ', icon: 'appstore' }
  ];

  trackByKey = (_: number, x: KpiCard) => x.key;
  abs(n: number) { return Math.abs(Math.round(n)); }

  selectedStatus: StatusKey | null = null;

  // ถ้า label ของ pie เป็น Open/Assigned/In Process/Closed
  private statusLabelMap: Record<StatusKey, string> = {
    open: 'Open',
    assigned: 'Assigned',
    inprocess: 'In Process',
    closed: 'Closed',
    all: 'All'
  };

  get selectedPieSlice() {
    if (!this.selectedStatus || this.selectedStatus === 'all') return null;
    const label = this.statusLabelMap[this.selectedStatus];
    return this.statusPie.find(s => s.label === label) ?? null;
  }

  // ใช้ตัวนี้เป็น “slice ที่ต้อง active” (hover มาก่อน)
  get activePieSlice() {
    return this.hoverPie ?? this.selectedPieSlice;
  }

  // ===== CHART (SVG, no lib) =====
  mode: ChartMode = 'line';

  statusData: any;
  hoverPie: any = null;
  hoverBar: any = null;

  pieSize = 200;
  barWidth = 500;
  barHeight = 220;

  statusPie: any[] = [];
  servicePie: any[] = [];
  bars: any[] = [];
  hoverServicePie: any = null;
  baseLineY = 0;
  leftPadX = 40;
  rightPadX = 0;
  ngOnInit(): void {
    this.generateStatusPie();
    this.generateServicePie();
    this.generateBar();
  }

  // setHover(p: { x: number; y: number; label: string; value: number }) {
  //   this.hover = { label: p.label, value: p.value, x: p.x, y: p.y };
  // }

  // clearHover() {
  //   this.hover = null;
  // }

  // clamp(v: number, min: number, max: number) {
  //   return Math.max(min, Math.min(max, v));
  // }

  /* ===== PIE ===== */

  generateStatusPie() {
    const data = [
      { label: 'Open', value: 52, color: '#2563eb' },
      { label: 'Assigned', value: 36, color: '#0ea5e9' },
      { label: 'In Process', value: 41, color: '#f97316' },
      { label: 'Closed', value: 45, color: '#22c55e' }
    ];
    this.statusPie = this.buildPie(data);
  }

  generateServicePie() {
    const data = [
      { label: 'ขอใช้บริการ', value: 120, color: '#6366f1' },
      { label: 'แจ้งซ่อม', value: 80, color: '#ef4444' },
      { label: 'แจ้งปัญหา', value: 60, color: '#14b8a6' }
    ];
    this.servicePie = this.buildPie(data);
  }

  buildPie(data: any[]) {
    const total = data.reduce((a, b) => a + b.value, 0);
    let start = 0;

    return data.map(d => {
      const percent = (d.value / total) * 100;
      const angle = percent * 3.6;
      const end = start + angle;
      const midAngle = start + angle / 2;

      const path = this.describeArc(
        this.pieSize / 2,
        this.pieSize / 2,
        this.pieSize / 2 - 10,
        start,
        end
      );

      start = end;

      return { ...d, percent, d: path, midAngle };
    });
  }
  /* ===== BAR ===== */

  generateBar() {
    const data = [
      { label: 'ONEE', value: 120 },
      { label: 'GTV', value: 85 },
      { label: 'FLD', value: 60 },
      { label: 'ARTS', value: 40 }
    ];

    const max = Math.max(...data.map(d => d.value));

    const leftPad = 40;
    const rightPad = 20;
    const topPad = 16;
    const bottomPad = 28;     // เว้นไว้ให้ baseline
    const baseLine = this.barHeight - bottomPad;

    const plotW = this.barWidth - leftPad - rightPad;
    const plotH = this.barHeight - topPad - bottomPad;

    const n = data.length;
    const slot = plotW / n;
    const bw = Math.min(70, slot * 0.6);

    this.bars = data.map((d, i) => {
      const h = (d.value / max) * plotH;
      const x = leftPad + i * slot + (slot - bw) / 2;
      const y = baseLine - h;

      return {
        label: d.label,
        value: d.value,
        x, y,
        width: bw,
        height: h
      };
    });

    this.baseLineY = baseLine;   // ใช้ใน HTML
    this.leftPadX = leftPad;
    this.rightPadX = this.barWidth - rightPad;
  }

  /* ===== SVG HELPER ===== */

  polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  describeArc(cx: number, cy: number, r: number, start: number, end: number) {
    const startPt = this.polarToCartesian(cx, cy, r, end);
    const endPt = this.polarToCartesian(cx, cy, r, start);
    const largeArcFlag = end - start <= 180 ? 0 : 1;

    return `
    M ${startPt.x} ${startPt.y}
    A ${r} ${r} 0 ${largeArcFlag} 0 ${endPt.x} ${endPt.y}
    L ${cx} ${cy}
    Z
  `;
  }

  getSliceTransform(s: any): string | null {
    const active = this.activePieSlice;
    if (active !== s) return null;

    const angle = (s.midAngle - 90) * Math.PI / 180;
    const x = Math.cos(angle) * 6;
    const y = Math.sin(angle) * 6;
    return `translate(${x}, ${y})`;
  }

  getSliceTransformService(s: any): string | null {
    if (this.hoverServicePie !== s) return null;
    const angle = (s.midAngle - 90) * Math.PI / 180;
    const x = Math.cos(angle) * 6;
    const y = Math.sin(angle) * 6;
    return `translate(${x}, ${y})`;
  }

  generateKpi() {
    const total = this.statusData.reduce((a: any, b: any) => a + b.value, 0);

    this.kpis = this.statusData.map((s: any) => ({
      key: s.label.toLowerCase(),
      title: s.label,
      value: s.value,
      delta: Number(((s.value / total) * 100).toFixed(1)),
      hint: 'Tickets',
      icon: 'inbox'
    }));
  }

  selectStatus(k: StatusKey) {
    this.activeStatus = k;
    this.selectedStatus = (k === 'all') ? null : k;
  }
}

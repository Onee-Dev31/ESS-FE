import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Attachment, TicketItem, TicketStatus } from '../../interfaces/it-dashboard.interface';
import { tickets } from '../../utils/it-dashboard-mock';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ItDashboardSummary } from './it-dashboard-summary/it-dashboard-summary';

@Component({
  selector: 'app-dashboard-it',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
  ItDashboardSummary],
  templateUrl: './dashboard-it.html',
  styleUrl: './dashboard-it.scss',
})
export class DashboardIT {
  keyword = '';
  TicketStatus: any;

  filterStatus: 'all' | TicketStatus = 'all';
  selectedTicket: TicketItem | null = null;

  selectedId = 1;

  tickets: TicketItem[] = tickets;

  constructor(private msg: NzMessageService) { }

  getSelectedTicket(): TicketItem | null {
    return this.tickets.find(x => x.id === this.selectedId) ?? null;
  }

  trackById = (_: number, item: TicketItem) => item.id;

  selectTicket(t: TicketItem) {
    this.selectedId = t.id;
    this.selectedTicket = t;
  }

  filteredTickets(): TicketItem[] {
    const kw = (this.keyword ?? '').trim().toLowerCase();

    return this.tickets.filter(t => {
      const matchStatus = this.filterStatus === 'all' ? true : t.status === this.filterStatus;
      const matchKw = !kw
        ? true
        : (t.ticketNo.toLowerCase().includes(kw) || t.title.toLowerCase().includes(kw));
      return matchStatus && matchKw;
    });
  }

  statusLabel(s: TicketStatus) {
    switch (s) {
      case 'inprocess': return 'In Process Tickets';
      case 'assigned': return 'Assigned Tickets';
      case 'done': return 'Done';
      default: return s;
    }
  }

  copy(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.msg.success('คัดลอกแล้ว');
  }

  openAddNote() {
    this.msg.info('TODO: เปิด Modal เพิ่ม Note');
  }

  previewFile(f: Attachment) {
    this.msg.info(`ดูไฟล์: ${f.name}`);
  }

  downloadFile(f: Attachment) {
    this.msg.info(`ดาวน์โหลด: ${f.name}`);
  }

  forwardTicket() {
    this.msg.warning('TODO: ส่งต่อ Ticket');
  }

  closeTicket() {
    this.msg.success('TODO: ปิดงาน (confirm)');
  }
}

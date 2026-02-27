import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Attachment, StatusKey, TicketItem } from '../../interfaces/it-dashboard.interface';
import { tickets } from '../../utils/it-dashboard-mock';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../services/auth.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ItDashboardSummary } from './it-dashboard-summary/it-dashboard-summary';

@Component({
  selector: 'app-dashboard-it',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    ItDashboardSummary],
  templateUrl: './dashboard-it.html',
  styleUrl: './dashboard-it.scss',
})
export class DashboardIT {

  keyword = '';
  TicketStatus: any;

  filterStatus: StatusKey | null = 'all';
  selectedTicket: TicketItem | null = null;

  selectedId = 1;

  tickets: TicketItem[] = tickets;

  isAssignModalVisible = false;
  assignSearchKeyword = '';
  selectedAssigneeEmpCodes: string[] = [];

  assigneeGroups = [
    {
      name: 'BMS-Oracle-Onee App',
      members: [
        'FONE0004', 'OTD01036', 'OTD01056', 'OTD01095', 'OTD01097'
      ]
    },
    {
      name: 'ระบบอื่นๆ',
      members: [
        'FONE0015', 'OTD01050', 'OTD01072', 'OTD01125', 'OTD01128', 'STD0001'
      ]
    },
    {
      name: 'Hardware & Software',
      members: [
        'OTD01022', 'OTD01116', 'OTD01117', 'OTD01119', 'OTD01120'
      ]
    }
  ];

  get filteredAssigneeGroups() {
    const kw = (this.assignSearchKeyword || '').trim().toLowerCase();
    if (!kw) return this.assigneeGroups;
    return this.assigneeGroups.map(g => ({
      ...g,
      members: g.members.filter(m => m.toLowerCase().includes(kw))
    })).filter(g => g.members.length > 0);
  }

  constructor(
    private msg: NzMessageService,
    private auth: AuthService
  ) { }

  onStatusChange(status: StatusKey | null) {
    this.filterStatus = status ?? 'all';  // ✅ ถ้า null → all
    this.filteredTickets(); // หรือเรียก filterStatus(status) ของคุณ
  }
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

  statusLabel(s: StatusKey) {
    switch (s) {
      case 'inprocess': return 'In Process Tickets';
      case 'assigned': return 'Assigned Tickets';
      case 'done': return 'Done';
      case 'open': return 'Open';
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
    this.isAssignModalVisible = true;
    this.selectedAssigneeEmpCodes = [];
    this.assignSearchKeyword = '';
  }

  acknowledgeTicket() {
    const user = this.auth.userData();
    if (this.selectedTicket && user) {
      this.selectedTicket.status = 'assigned';
      this.selectedTicket.assignee = {
        name: user.USR_NAME_TH || user.USR_NAME_EN || 'Me',
        email: user.USR_EMAIL || '',
        phone: user.USR_MOBILE || '-',
        avatar: (user.USR_NAME_EN || 'ME').substring(0, 2),
        avatarBg: 'var(--primary)'
      };
      this.msg.success('คุณได้รับเรื่องเรียบร้อยแล้ว');
    } else {
      // Fallback or if not logged in
      this.forwardTicket();
    }
  }

  closeTicket() {
    this.msg.success('TODO: ปิดงาน (confirm)');
  }

  closeAssignModal() {
    this.isAssignModalVisible = false;
  }

  toggleAssignee(empCode: string) {
    const idx = this.selectedAssigneeEmpCodes.indexOf(empCode);
    if (idx > -1) {
      this.selectedAssigneeEmpCodes.splice(idx, 1);
    } else {
      this.selectedAssigneeEmpCodes.push(empCode);
    }
  }

  toggleGroup(group: any) {
    const allIn = group.members.every((m: string) => this.selectedAssigneeEmpCodes.includes(m));
    if (allIn) {
      // Remove all
      this.selectedAssigneeEmpCodes = this.selectedAssigneeEmpCodes.filter(c => !group.members.includes(c));
    } else {
      // Add missing ones
      group.members.forEach((m: string) => {
        if (!this.selectedAssigneeEmpCodes.includes(m)) {
          this.selectedAssigneeEmpCodes.push(m);
        }
      });
    }
  }

  isGroupSelected(group: any): boolean {
    return group.members.every((m: string) => this.selectedAssigneeEmpCodes.includes(m));
  }

  removeAssignee(empCode: string) {
    this.selectedAssigneeEmpCodes = this.selectedAssigneeEmpCodes.filter(c => c !== empCode);
  }

  submitAssign() {
    if (this.selectedAssigneeEmpCodes.length === 0) {
      this.msg.warning('กรุณาเลือกผู้รับผิดชอบ');
      return;
    }
    const selectedNames = this.selectedAssigneeEmpCodes.join(', ');

    if (this.selectedTicket && this.selectedTicket.assignee) {
      this.selectedTicket.status = 'assigned'; // Update status
      const first = this.selectedAssigneeEmpCodes[0];
      this.selectedTicket.assignee.name = selectedNames;
      this.selectedTicket.assignee.email = `${first.toLowerCase()}@oneeclick.com`;
      this.selectedTicket.assignee.avatar = first.substring(0, 2);
      this.selectedTicket.assignee.avatarBg = 'var(--primary)';
    }

    this.msg.success(`มอบหมายงานให้ ${this.selectedAssigneeEmpCodes.length} ท่าน เรียบร้อยแล้ว`);
    this.isAssignModalVisible = false;
  }

  onImgError(event: any) {
    event.target.style.display = 'none';
  }

  openImage(empCode: string) {
    console.log('Open image:', empCode);
  }
}


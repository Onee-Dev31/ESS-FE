import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
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
import { ItServiceService } from '../../services/it-service.service';
import { StatusColor, ticketTypyColor } from '../../utils/status.util';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FilePreviewItem, FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';

@Component({
  selector: 'app-dashboard-it',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    ItDashboardSummary, FilePreviewModalComponent],
  templateUrl: './dashboard-it.html',
  styleUrl: './dashboard-it.scss',
})
export class DashboardIT implements OnInit {

  private itServiceService = inject(ItServiceService);
  StatusColor = StatusColor;


  keyword = '';
  TicketStatus: any;

  filterStatus: StatusKey | null = 'all';

  selectedId = 1;

  Tickets = signal<any[]>(tickets)
  selectedTicket = signal<any | undefined>(undefined);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  isAssignModalVisible = false;
  assignSearchKeyword = '';
  selectedAssigneeEmpCodes: string[] = [];

  assigneeGroups: any[] = [];

  // assigneeGroups = [
  //   {
  //     name: 'BMS-Oracle-Onee App',
  //     members: [
  //       'FONE0004', 'OTD01036', 'OTD01056', 'OTD01095', 'OTD01097'
  //     ]
  //   },
  //   {
  //     name: 'ระบบอื่นๆ',
  //     members: [
  //       'FONE0015', 'OTD01050', 'OTD01072', 'OTD01125', 'OTD01128', 'STD0001'
  //     ]
  //   },
  //   {
  //     name: 'Hardware & Software',
  //     members: [
  //       'OTD01022', 'OTD01116', 'OTD01117', 'OTD01119', 'OTD01120'
  //     ]
  //   }
  // ];

  get filteredAssigneeGroups() {
    const kw = (this.assignSearchKeyword || '').trim().toLowerCase();
    if (!kw) return this.assigneeGroups;
    return this.assigneeGroups.map(g => ({
      ...g,
      members: g.members.filter((m: any) => m.name.toLowerCase().includes(kw))
    })).filter(g => g.members.length > 0);
  }

  constructor(
    private msg: NzMessageService,
    private auth: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.getAllTickets();
    this.getAssignItDropdown();
  }

  onStatusChange(status: StatusKey | null) {
    this.filterStatus = status ?? 'all';  // ✅ ถ้า null → all
    // this.filteredTickets(); // หรือเรียก filterStatus(status) ของคุณ
  }
  // getSelectedTicket(): TicketItem | null {
  //   return this.tickets.find(x => x.id === this.selectedId) ?? null;
  // }

  trackById = (_: number, item: TicketItem) => item.id;

  // selectTicket(ticketId: string) {
  //   // this.selectedId = t.id;
  //   // this.selectedTicket = t;
  //   console.log(ticketId)
  // }

  selectTicket(ticketId: string) {
    console.log(ticketId)
    this.getTicketById(ticketId).subscribe(async (res: any) => {
      console.log(res)

      let convertedFiles: any[] = [];

      if (res.attachments?.length) {
        convertedFiles = await Promise.all(
          res.attachments.map((f: any) =>
            this.convertUrlToFile({
              id: f.id,
              fileName: f.file_name,
              filePath: f.file_path,
              fileType: f.file_type,
              fileSize: f.file_size,
              fileDescription: f.file_description,
              uploadedByaAduser: f.uploaded_by_aduser,
              created_date: f.created_at
            })
          )
        );
      }



      const ticket = res.ticket;
      const replies = res.replies;
      const services = res.services;
      const attachments = convertedFiles

      // res.attachments.map((item: any) => ({
      //   id: item.id,
      //   ticketId: item.ticket_id,
      //   fileName: item.file_name,
      //   filePath: item.file_path,
      //   fileType: item.file_type,
      //   fileSize: item.file_size,
      //   fileDescription: item.file_description,
      //   uploadedByaAduser: item.uploaded_by_aduser,
      //   created_date: item.created_at
      // }));
      const assignGroups = res.assignGroups;

      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        ticketType: ticket.ticket_type_name_th,
        status: ticket.status,
        priority: ticket.priority,
        source: ticket.source,
        createdDate: new Date(ticket.created_at).toISOString(),
        requesterCode: ticket.requester_code,
        requesterAduser: ticket.requester_aduser,
        requesterName: ticket.requester_name,
        requesterEmail: ticket.requester_email,
        requesterDept: ticket.requester_dept,
        requesterCompanyCode: ticket.requester_companyCode,
        requesterCompanyName: ticket.requester_companyName,
        requesterPhone: ticket.contact_phone,
        // requesterInitials: 'MP', //ชื่อย่อ
        requesterColor: ticketTypyColor.getColor(ticket.ticket_type_id),
        attachments: attachments,
        itNotes: [],
        assigneeName: '',
        assigneeAduser: '',
        assigneeEmail: '',
        assigneePhone: '',
      }

      console.log("selectedTicket:", objectData)
      this.selectedTicket.set(objectData);
    }
    );



  }

  // filteredTickets(): TicketItem[] {
  //   const kw = (this.keyword ?? '').trim().toLowerCase();

  //   return this.tickets.filter(t => {
  //     const matchStatus = this.filterStatus === 'all' ? true : t.status === this.filterStatus;
  //     const matchKw = !kw
  //       ? true
  //       : (t.ticketNo.toLowerCase().includes(kw) || t.title.toLowerCase().includes(kw));
  //     return matchStatus && matchKw;
  //   });
  // }

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

  safeUrl!: SafeResourceUrl;

  previewFile(f: any) {
    this.msg.info(`ดูไฟล์: ${f.name}`);
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(f.file_path);
    console.log(this.safeUrl)
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
    // if (this.selectedTicket && user) {
    //   this.selectedTicket.status = 'assigned';
    //   this.selectedTicket.assignee = {
    //     name: user.USR_NAME_TH || user.USR_NAME_EN || 'Me',
    //     email: user.USR_EMAIL || '',
    //     phone: user.USR_MOBILE || '-',
    //     avatar: (user.USR_NAME_EN || 'ME').substring(0, 2),
    //     avatarBg: 'var(--primary)'
    //   };
    //   this.msg.success('คุณได้รับเรื่องเรียบร้อยแล้ว');
    // } else {
    //   // Fallback or if not logged in
    //   this.forwardTicket();
    // }
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

    // if (this.selectedTicket && this.selectedTicket.assignee) {
    //   this.selectedTicket.status = 'assigned'; // Update status
    //   const first = this.selectedAssigneeEmpCodes[0];
    //   this.selectedTicket.assignee.name = selectedNames;
    //   this.selectedTicket.assignee.email = `${first.toLowerCase()}@oneeclick.com`;
    //   this.selectedTicket.assignee.avatar = first.substring(0, 2);
    //   this.selectedTicket.assignee.avatarBg = 'var(--primary)';
    // }

    this.msg.success(`มอบหมายงานให้ ${this.selectedAssigneeEmpCodes.length} ท่าน เรียบร้อยแล้ว`);
    this.isAssignModalVisible = false;
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  openImage(empCode: string) {
    console.log('Open image:', empCode);
  }
  // FUNCTION

  isToday(dateValue: string | Date): boolean {
    const date = new Date(dateValue);
    const now = new Date();

    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  private async convertUrlToFile(fileData: any) {

    try {

      const response = await fetch(fileData.filePath);

      if (!response.ok) {
        throw new Error('Fetch failed');
      }

      const blob = await response.blob();

      const file = new File(
        [blob],
        fileData.fileName,
        { type: fileData.fileType }
      );

      return {
        fileId: fileData.id,
        name: fileData.fileName,
        file: file,
        description: fileData.fileDescription || '',
        uploadedByAduser: fileData.uploadedByaAduser,
        createdDate: fileData.created_date,
        filePath: fileData.filePath,
        size: fileData.fileSize,
        type: fileData.fileType,
        isError: false
      };

    } catch (error) {

      console.warn('File fetch failed:', fileData.fileName);

      // 🔥 fallback return
      return {
        fileId: fileData.id,
        name: fileData.fileName,
        file: null,  // ไม่มี blob
        description: fileData.fileDescription || '',
        uploadedByAduser: fileData.uploadedByaAduser,
        createdDate: fileData.created_date,
        filePath: fileData.filePath,
        size: fileData.fileSize,
        type: fileData.fileType,
        isError: true
      };
    }
  }

  viewFile(file: any) {

    console.log("file", file)
    this.previewFiles.set([{
      fileName: file.fileName,
      date: dayjs().format('DD/MM/YYYY HH:mm'),
      url: file.filePath,
      type: file.type || 'image/png'
    }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }


  // GET MASTER
  getAllTickets() {
    this.itServiceService.getAllTickets({ page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        console.log(res);
        this.Tickets.set(res.data.map((ticket: any) => ({
          ...ticket,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          ticketType: ticket.ticket_type_name_th,
          status: ticket.status,
          createdDate: new Date(ticket.created_at).toISOString(),
          requesterEmpId: ticket.requester_codeempid,
          subject: ticket.subject
        })))

        console.log(this.Tickets())
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  getTicketById(ticketId: string) {
    return this.itServiceService.getTicketById(ticketId)
  }

  getAssignItDropdown() {
    this.itServiceService.getAssignItDropdown().subscribe({
      next: (res) => {
        console.log(res)

        const rows = res.data

        const groupMap: Record<any, any> = {};
        const assigneeGroup: any = [];

        // สร้าง group
        rows.forEach((r: any) => {
          if (r.type === 'GROUP') {
            groupMap[r.id] = {
              name: r.display_name,
              members: []
            };
          }
        });

        // ใส่ employee
        rows.forEach((r: any) => {
          if (r.type === 'EMPLOYEE' && groupMap[r.group_id]) {
            groupMap[r.group_id].members.push({
              id: r.id,
              name: r.display_name,

            });
          }
        });
        // แปลงเป็น array
        Object.values(groupMap).forEach(g => assigneeGroup.push(g));

        console.log(assigneeGroup);
        this.assigneeGroups = assigneeGroup
      }
      , error: (error) => {
        console.error('Error fetching data:', error);
      }
    })
  }
}


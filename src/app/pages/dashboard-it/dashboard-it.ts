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
import { StatusColor, ticketTypyColor, StatusColor_Reverse } from '../../utils/status.util';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FilePreviewItem, FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { ItProblemReportComponent } from "../it-problem-report/it-problem-report";
import { ItRepairRequestComponent } from "../it-repair-request/it-repair-request";
import { ITServiceRequestComponent } from "../it-service-request/it-service-request";

@Component({
  selector: 'app-dashboard-it',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    ItDashboardSummary, FilePreviewModalComponent, ItProblemReportComponent, ItRepairRequestComponent, ITServiceRequestComponent],
  templateUrl: './dashboard-it.html',
  styleUrl: './dashboard-it.scss',
})
export class DashboardIT implements OnInit {

  private itServiceService = inject(ItServiceService);
  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;


  Tickets = signal<any[]>(tickets)
  selectedTicket = signal<any | undefined>(undefined);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  isVisibleAssignee = signal<boolean>(false);
  selectedAssignee = signal<any | undefined>(undefined);

  assigneeGroups: any[] = [];
  get filteredAssigneeGroups() {
    const kw = (this.assignSearchKeyword || '').trim().toLowerCase();
    if (!kw) return this.assigneeGroups;
    return this.assigneeGroups.map(g => ({
      ...g,
      members: g.members.filter((m: any) => m.name.toLowerCase().includes(kw))
    })).filter(g => g.members.length > 0);
  }

  IS_OPEN_IT_SERVICE = signal(0);
  IS_DENY_TICKET = signal(false);
  IS_ACKNOWLEDGE_TICKET = signal(false);
  IS_NOTE_TICKET = signal(false);

  keyword = '';
  TicketStatus: any;

  filterStatus: StatusKey | null = 'all';

  selectedId = 1;
  isAssignModalVisible = false;
  assignSearchKeyword = '';
  selectedAssigneeEmpCodes: any[] = [];

  constructor(
    private msg: NzMessageService,
    private auth: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.getAllTickets();
    this.getAssignItDropdown();
  }

  close() {
    this.IS_OPEN_IT_SERVICE.set(0)
  }
  closeDenyTicket() {
    this.IS_DENY_TICKET.set(false)
  }

  onStatusChange(status: StatusKey | null) {
    this.filterStatus = status ?? 'all';  // ✅ ถ้า null → all
    // this.filteredTickets(); // หรือเรียก filterStatus(status) ของคุณ
  }

  trackById = (_: number, item: TicketItem) => item.id;

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
      const assignGroups = res.assignGroups;

      const mockAssignData_2: any = [
        {
          step: 1,
          Assignee: [],
          title: 'เปิดคำขอ',
          description: 'เปิดคำขอ',
          status: 'Open',
          createBy: {
            fullName: 'แพรวนภา บุตรโคษา',
            nickName: 'แพรว',
            empCode: 'OTD01050',
            adUser: 'praewnapaboo'
          },
          createdDate: new Date('2026-03-04T10:00:00').toISOString(),
        },
        {
          step: 2,
          title: 'ส่งต่อ',
          description: 'ส่งต่อ',
          status: 'Assigned',
          Assignee: [
            { id: 1, fullName: 'แพรวนภา บุตรโคษา', nickName: 'แพรว', empCode: 'OTD01050', adUser: 'praewnapaboo', email: 'praewnapa.boo@onee.one', phone: '1234' },
            { id: 2, fullName: 'นพพร เอี่ยมขำ', nickName: 'หนึ่ง', empCode: 'OTD01072', adUser: 'nopporneam', email: 'nopporn.eam@onee.one', phone: '1235' },
          ],
          createBy: {
            fullName: 'แพรวนภา บุตรโคษา',
            nickName: 'แพรว',
            empCode: 'OTD01050',
            adUser: 'praewnapaboo'
          },
          createdDate: new Date('2026-03-04T10:10:00').toISOString(),
        },
        {
          step: 3,
          title: 'ส่งต่อ',
          description: 'ส่งต่อ',
          status: 'Assigned',
          Assignee: [
            { id: 1, fullName: 'แพรวนภา บุตรโคษา', nickName: 'แพรว', empCode: 'OTD01050', adUser: 'praewnapaboo', email: 'praewnapa.boo@onee.one', phone: '1234' },
            { id: 2, fullName: 'นพพร เอี่ยมขำ', nickName: 'หนึ่ง', empCode: 'OTD01072', adUser: 'nopporneam', email: 'nopporn.eam@onee.one', phone: '1235' },
            { id: 3, fullName: 'ธนากร ดวงแก้ว', nickName: 'คอปเตอร์', empCode: 'OTD01125', adUser: 'thanakorndua', email: 'thanakorn.dua@onee.one', phone: '' },
          ],
          createBy: {
            fullName: 'แพรวนภา บุตรโคษา',
            nickName: 'แพรว',
            empCode: 'OTD01050',
            adUser: 'praewnapaboo'
          },
          createdDate: new Date('2026-03-04T10:30:00').toISOString(),
        },
        {
          step: 4,
          title: 'กำลังดำเนินการ',
          description: 'กำลังดำเนินการ',
          status: 'In Progress',
          Assignee: [],
          createBy: {
            fullName: 'ธนากร ดวงแก้ว',
            nickName: 'คอปเตอร์',
            empCode: 'OTD01125',
            adUser: 'thanakorndua'
          },
          createdDate: new Date('2026-03-04T10:33:00').toISOString(),
        },
        {
          step: 5,
          title: 'ส่งต่อ',
          description: 'ส่งต่อ',
          status: 'Assigned',
          Assignee: [
            { id: 1, fullName: 'แพรวนภา บุตรโคษา', nickName: 'แพรว', empCode: 'OTD01050', adUser: 'praewnapaboo', email: 'praewnapa.boo@onee.one', phone: '1234' },
            { id: 2, fullName: 'นพพร เอี่ยมขำ', nickName: 'หนึ่ง', empCode: 'OTD01072', adUser: 'nopporneam', email: 'nopporn.eam@onee.one', phone: '1235' },
            { id: 3, fullName: 'ธนากร ดวงแก้ว', nickName: 'คอปเตอร์', empCode: 'OTD01125', adUser: 'thanakorndua', email: 'thanakorn.dua@onee.one', phone: '' },
            { id: 4, fullName: 'ธราดล แก้วอนันต์', nickName: 'ฟลุ๊ค', empCode: 'OTD01128', adUser: '"tharadolkae', email: 'tharadol.kae@onee.one', phone: '1237' },
          ],
          createBy: {
            fullName: 'ธนากร ดวงแก้ว',
            nickName: 'คอปเตอร์',
            empCode: 'OTD01125',
            adUser: 'thanakorndua'
          },
          createdDate: new Date('2026-03-04T10:48:00').toISOString(),
        },
        {
          step: 6,
          title: 'กำลังดำเนินการ',
          description: 'กำลังดำเนินการ',
          status: 'In Progress',
          Assignee: [],
          createBy: {
            fullName: 'ธราดล แก้วอนันต์',
            nickName: 'ฟลุ๊ค',
            empCode: 'OTD01128',
            adUser: '"tharadolkae'
          },
          createdDate: new Date('2026-03-04T10:50:00').toISOString(),
        },
        {
          step: 7,
          title: 'รอข้อมูลเพิ่มเติม',
          description: 'รอข้อมูลเพิ่มเติม',
          status: 'On Hold',
          Assignee: [],
          createBy: {
            fullName: 'ธราดล แก้วอนันต์',
            nickName: 'ฟลุ๊ค',
            empCode: 'OTD01128',
            adUser: '"tharadolkae'
          },
          createdDate: new Date('2026-03-04T12:00:00').toISOString(),
        },
        {
          step: 8,
          title: 'แก้ไขเสร็จสิ้น',
          description: 'แก้ไขเสร็จสิ้น',
          status: 'Resolved',
          Assignee: [],
          createBy: {
            fullName: 'ธราดล แก้วอนันต์',
            nickName: 'ฟลุ๊ค',
            empCode: 'OTD01128',
            adUser: '"tharadolkae'
          },
          createdDate: new Date('2026-03-05T17:05:32').toISOString(),
        },
        {
          step: 9,
          title: 'ปิดแล้ว',
          description: 'ปิดแล้ว',
          status: 'Closed',
          Assignee: [],
          createBy: {
            fullName: 'แพรวนภา บุตรโคษา',
            nickName: 'แพรว',
            empCode: 'OTD01050',
            adUser: 'praewnapaboo'
          },
          createdDate: new Date('2026-03-05T17:30:03').toISOString(),
        },
      ];

      const mockitNotes: any = [
        {
          id: 1,
          message: 'เสร็จยัง',
          createdDate: new Date('2026-03-04T16:00:00').toISOString(),
          createBy: {
            fullName: 'แพรวนภา บุตรโคษา',
            nickName: 'แพรว',
            empCode: 'OTD01050',
            adUser: 'praewnapaboo',
            role: 'it'
          }
        },
        {
          id: 2,
          message: 'เสร็จยัง ? ',
          createdDate: new Date('2026-03-05T16:30:00').toISOString(),
          createBy: {
            fullName: 'แพรวนภา บุตรโคษา',
            nickName: 'แพรว',
            empCode: 'OTD01050',
            adUser: 'praewnapaboo',
            role: 'it'
          }
        }
      ]


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
        itNotes: ticket.requester_code === 'OTD01050' ? mockitNotes : [],
        assigneeName: '',
        assigneeAduser: '',
        assigneeEmail: '',
        assigneePhone: '',
        assign: ticket.requester_code === 'OTD01050' ? mockAssignData_2 : []
      }

      console.log("selectedTicket:", objectData)
      this.selectedTicket.set(objectData);
    }
    );



  }

  selectAssignee(item: any) {
    console.log(item)
    this.isVisibleAssignee.set(true)
    this.selectedAssignee.set(item)
  }

  closeAssignee() {
    this.isVisibleAssignee.set(false)
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
    this.IS_NOTE_TICKET.set(true)
  }

  closeAddNoteModal() {
    this.IS_NOTE_TICKET.set(false);
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
    // console.log(user)
    this.IS_ACKNOWLEDGE_TICKET.set(true)
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

  closeAcknowledgeModal() {
    this.IS_ACKNOWLEDGE_TICKET.set(false);
  }

  closeTicket() {
    this.msg.success('TODO: ปิดงาน (confirm)');
  }

  closeAssignModal() {
    this.isAssignModalVisible = false;
  }

  toggleAssignee(emp: any) {
    const idx = this.selectedAssigneeEmpCodes.indexOf(emp.id);
    if (idx > -1) {
      this.selectedAssigneeEmpCodes.splice(idx, 1);
    } else {
      this.selectedAssigneeEmpCodes.push(emp);
    }

    console.log(this.selectedAssigneeEmpCodes)

  }

  toggleGroup(group: any) {

    const memberIds = group.members.map((m: any) => m.id);

    const allIn = memberIds.every((id: any) =>
      this.selectedAssigneeEmpCodes.some(e => e.id === id)
    );

    if (allIn) {

      this.selectedAssigneeEmpCodes =
        this.selectedAssigneeEmpCodes.filter(e => !memberIds.includes(e.id));

    } else {

      group.members.forEach((m: any) => {

        const exists = this.selectedAssigneeEmpCodes.some(e => e.id === m.id);

        if (!exists) {
          this.selectedAssigneeEmpCodes.push(m);
        }

      });

    }

  }

  isGroupSelected(group: any): boolean {
    return group.members.every((m: any) =>
      this.selectedAssigneeEmpCodes.some(e => e.id === m.id)
    );
  }
  
  isSelected(empId: string): boolean {
    return this.selectedAssigneeEmpCodes.some(e => e.id === empId);
  }


  removeAssignee(empId: string) {

    this.selectedAssigneeEmpCodes =
      this.selectedAssigneeEmpCodes.filter(e => e.id !== empId);

  }

  submitAssign() {
    if (this.selectedAssigneeEmpCodes.length === 0) {
      this.msg.warning('กรุณาเลือกผู้รับผิดชอบ');
      return;
    }

    console.log(this.selectedAssigneeEmpCodes)

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

  // FUNCTION
  handleDeny() {
    console.log("DENY")
    this.IS_DENY_TICKET.set(true)
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
          requesterEmpId: ticket.requester_code,
          // requesterEmpId: ticket.requester_codeempid,
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


import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Attachment, StatusKey, TicketItem } from '../../interfaces/it-dashboard.interface';
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
import { SwalService } from '../../services/swal.service';
import { tickets } from '../../utils/it-dashboard-mock';
import { AcknowledgeModal } from "./modal/acknowledge-modal/acknowledge-modal";
import { DenyModal } from "./modal/deny-modal/deny-modal";
import { AssignModal } from "./modal/assign-modal/assign-modal";
import { NoteModal } from './modal/note-modal/note-modal';
@Component({
  selector: 'app-dashboard-it',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    ItDashboardSummary, FilePreviewModalComponent, ItProblemReportComponent, ItRepairRequestComponent, ITServiceRequestComponent,
    AcknowledgeModal,
    DenyModal,
    AssignModal,
    NoteModal
  ],
  templateUrl: './dashboard-it.html',
  styleUrl: './dashboard-it.scss',
})
export class DashboardIT implements OnInit {

  private itServiceService = inject(ItServiceService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);

  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;

  currentUserEmpCode = this.authService.userData().CODEMPID;

  Tickets = signal<any[]>(tickets)
  selectedTicket = signal<any | undefined>(undefined);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  isVisibleAssignee = signal<boolean>(false);
  selectedAssignee = signal<any | undefined>(undefined);

  assigneeGroups: any[] = [];

  IS_OPEN_IT_SERVICE = signal(0);
  IS_DENY_TICKET = signal(false);
  IS_ONHOLD_TICKET = signal(false);
  IS_ACKNOWLEDGE_TICKET = signal(false);
  IS_NOTE_TICKET = signal(false);
  IS_ASSIGN_TICKET = signal(false);

  keyword = '';
  TicketStatus: any;

  filterStatus: string | null = 'all';

  selectedId = 1;
  // isAssignModalVisible = false;
  assignSearchKeyword = '';
  selectedAssigneeEmpCodes: any[] = [];

  constructor(
    private msg: NzMessageService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.getAllTickets();
    this.getAssignItDropdown();
  }

  close() {
    this.IS_OPEN_IT_SERVICE.set(0)
  }

  onStatusChange(status: string | null) {
    this.filterStatus = status ?? 'all';  // ✅ ถ้า null → all
    // console.log("filterStatus : ", this.filterStatus);

    this.filteredTickets();
    // หรือเรียก filterStatus(status) ของคุณ
  }

  trackById = (_: number, item: TicketItem) => item.id;

  selectTicket(ticketId: string) {
    // console.log(ticketId)
    this.getTicketById(ticketId).subscribe(async (res: any) => {
      console.log(res)
      const ticketAttachments = res.attachments?.filter((f: any) => !f.reply_id) || [];
      const replyAttachments = res.attachments?.filter((f: any) => f.reply_id) || [];

      let convertedFiles: any[] = [];

      if (ticketAttachments.length) {
        convertedFiles = await Promise.all(
          ticketAttachments.map((f: any) =>
            this.convertUrlToFile(f)
          )
        );
      }

      const ticket = res.ticket;
      const replies = res.replies;
      const services = res.services;
      const attachments = convertedFiles
      const assignGroups = res.assignGroups;
      const assignments = res.assignments;

      const itNotes = await this.buildItNotes(replies, replyAttachments);
      const result = this.buildTimeline(res.timeline, res.timelineAssignees);

      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        ticketType: ticket.ticket_type_name_th,
        ticketTypeId: ticket.ticket_type_id,
        status: ticket.IT_Status,
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
        requesterColor: ticketTypyColor.getColor(ticket.ticket_type_id),
        attachments: attachments,
        itNotes: itNotes,
        assignments: assignments,
        assignTimeline: result
      }

      console.log("selectedTicket:", objectData)
      this.selectedTicket.set(objectData);
    }
    );
  }

  selectAssignee(item: any) {
    this.isVisibleAssignee.set(true)
    this.selectedAssignee.set(item)
  }

  closeAssignee() {
    this.isVisibleAssignee.set(false)
  }

  filteredTickets(): any[] {
    const kw = (this.keyword ?? '').trim().toLowerCase();

    const statusMap: any = {
      open: 'Open',
      assigned: 'Assigned',
      inprogress: 'In Progress',
      done: 'Closed'
    };

    const mappedStatus = statusMap[this.filterStatus ?? ''];

    return this.Tickets().filter((t: any) => {
      const matchStatus = this.filterStatus === 'all' ? true : t.IT_Status === mappedStatus;
      const matchKw = !kw
        ? true
        : (t.ticketNumber.toLowerCase().includes(kw) || t.subject.toLowerCase().includes(kw));
      return matchStatus && matchKw;
    });
  }

  statusLabel(s: string) {
    switch (s) {
      case 'inprogress': return 'In Progress Tickets';
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

  safeUrl!: SafeResourceUrl;

  previewFile(f: any) {
    this.msg.info(`ดูไฟล์: ${f.name}`);
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(f.file_path);
  }

  downloadFile(f: Attachment) {
    this.msg.info(`ดาวน์โหลด: ${f.name}`);
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
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
        name: fileData.file_name,
        file: file,
        description: fileData.file_description || '',
        uploadedByAduser: fileData.uploadedByaAduser,
        createdDate: fileData.created_at,
        filePath: fileData.file_path,
        size: fileData.file_size,
        type: fileData.file_type,
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

  private extractNickName(name: string) {

    const match = name.match(/\((.*?)\)/);

    return match ? match[1] : name;
  }
  viewFile(file: any) {
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

  buildTimeline(timelines: any[], assignees: any[]) {

    // console.log(timelines, assignees)

    return timelines.map(t => {

      const assigneeList = assignees
        .filter(a => a.timeline_id === t.timeline_id)
        .map(a => ({
          id: a.id,
          fullName: a.full_name,
          nickName: a.nickname,
          empCode: a.codeempid,
          adUser: a.aduser,
          email: a.email,
          phone: a.phone
        }));

      return {
        step: t.step,
        title: t.title,
        description: t.description,
        status: t.status,
        Assignee: assigneeList,

        createBy: {
          fullName: t.created_by_name,
          nickName: t.created_by_nickname,
          empCode: t.created_by_codeempid,
          adUser: t.created_by_aduser
        },

        createdDate: new Date(t.created_at).toISOString()
      };

    });

  }

  async buildItNotes(replies: any[], attachments: any[]) {

    const notes = await Promise.all(

      replies.map(async (r) => {

        // หาไฟล์ของ reply นี้
        const files = attachments.filter(a => a.reply_id === r.id);

        // convert file -> File object
        const convertedFiles = await Promise.all(
          files.map(f => this.convertUrlToFile(f))
        );

        return {
          id: r.id,
          message: r.message,
          attachments: convertedFiles,
          createdDate: r.created_at,
          createBy: {
            fullName: r.sender_name,
            nickName: this.extractNickName(r.sender_name),
            empCode: r.user_code,
            adUser: r.user_aduser,
            role: 'user'
          }
        };

      })

    );

    return notes;
  }

  // GET MASTER
  getAllTickets() {
    this.itServiceService.getAllTickets({ page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        console.log("getAllTickets() >>> res :", res);
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
        // console.log(res)

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
              adUser: r.AD_USER
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


  // MODAL
  //>>> function
  updateTicket(command: string, ticketId: string, ticketTypeId?: string, assignees?: any, comment?: any, attachments?: any[]) {
    // const payload = {
    //   decision: 'ITAnalyze', // -- Approved / Rejected / Referred_Back / ITAnalyze
    //   executedBy: this.authService.userData().CODEMPID,
    //   ...((command === 'resume') && { itResult: 'In Progress' }),
    //   ...((command === 'onhold') && { itResult: 'Hold' }),
    //   ...((command === 'close') && { itResult: 'Closed' }),
    //   ...((command === 'deny') && { itResult: 'Denied', comment: comment }),
    //   ...((command === 'assign') && { assignJson: assignees }),
    //   ...((command === 'acknowledge') && { Files: attachment, comment: comment }),
    //   ...((command === 'acknowledge' || command === 'assign') && { itResult: 'In Progress', newTicketTypeId: ticketTypeId }),
    // }

    const formData = new FormData();

    formData.append('decision', 'ITAnalyze');
    formData.append('executedBy', this.authService.userData().CODEMPID);

    if (command === 'resume') {
      formData.append('itResult', 'In Progress');
    }

    if (command === 'onhold') {
      formData.append('itResult', 'Hold');
    }

    if (command === 'close') {
      formData.append('itResult', 'Closed');
    }

    if (command === 'deny') {
      formData.append('itResult', 'Denied');
      formData.append('comment', comment);
    }

    if (command === 'assign') {
      formData.append('assignJson', JSON.stringify(assignees));
    }

    if (command === 'acknowledge') {
      formData.append('comment', comment);
    }

    if (command === 'acknowledge' || command === 'assign') {
      formData.append('itResult', 'In Progress');
      formData.append('newTicketTypeId', ticketTypeId || '2');
    }

    if (attachments) {
      attachments.forEach((item: any) => {
        if (item?.file instanceof File) {
          formData.append('Files', item.file);
        }
      });
    }

    console.log("formData", [...formData.entries()]);

    return this.itServiceService.updateTicket(ticketId, formData)
  }

  // -- acknowledge --
  openAcknowledgeModal() {
    this.IS_ACKNOWLEDGE_TICKET.set(true)
  }

  closeAcknowledgeModal() {
    this.IS_ACKNOWLEDGE_TICKET.set(false);
  }

  submitAcknowledge(data: any) {

    console.log(data)

    const ticket = this.selectedTicket();
    const ticketId = ticket?.ticketId;

    if (!ticketId) {
      this.swalService.warning("ไม่พบ Ticket");
      return;
    }

    if (!data?.ticketTypeId) {
      this.swalService.warning("กรุณาเลือกประเภท Ticket");
      return;
    }

    const tag = data.ticketTypeId;

    this.swalService.loading("กำลังบันทึกข้อมูล...");
    this.IS_ACKNOWLEDGE_TICKET.set(false);

    this.updateTicket('acknowledge', ticketId, tag, null, data.message, data.attachments)
      .subscribe({
        next: (res) => {

          if (!res?.success) {
            this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
            return;
          }

          this.swalService.success(res.message || "บันทึกสำเร็จ");

          this.selectTicket(ticketId);
          this.getAllTickets();

        },

        error: (error) => {
          console.error("Acknowledge Ticket Error:", error);

          this.swalService.warning(
            "เกิดข้อผิดพลาด",
            error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
          );
        }
      });

  }

  // -- deny --

  onHoldTicket() {
    this.swalService.confirm('ยืนยันการหยุดชั่วคราว (On Hold)')
      .then(result => {
        if (!result.isConfirmed) return;

        const ticket = this.selectedTicket();
        const ticketId = ticket?.ticketId;

        if (!ticketId) {
          this.msg.warning('ไม่พบ Ticket');
          return;
        }

        this.swalService.loading("กำลังบันทึกข้อมูล...");

        this.updateTicket('onhold', ticketId, '', null, null)
          .subscribe({
            next: (res) => {
              if (!res?.success) {
                this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
                return;
              }

              this.swalService.success(res.message || "บันทึกสำเร็จ");

              this.selectTicket(ticketId);
              this.getAllTickets();

            },

            error: (error) => {
              console.error("Acknowledge Ticket Error:", error);

              this.swalService.warning(
                "เกิดข้อผิดพลาด",
                error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
              );
            }
          });
      });
  }
  resumeTicket() {
    this.swalService.confirm('ยืนยันการกลับมาดำเนินการต่อ (Resume)')
      .then(result => {
        if (!result.isConfirmed) return;

        const ticket = this.selectedTicket();
        const ticketId = ticket?.ticketId;

        if (!ticketId) {
          this.msg.warning('ไม่พบ Ticket');
          return;
        }

        this.swalService.loading("กำลังบันทึกข้อมูล...");

        this.updateTicket('resume', ticketId, '', null, null)
          .subscribe({
            next: (res) => {
              if (!res?.success) {
                this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
                return;
              }

              this.swalService.success(res.message || "บันทึกสำเร็จ");

              this.selectTicket(ticketId);
              this.getAllTickets();

            },

            error: (error) => {
              console.error("Acknowledge Ticket Error:", error);

              this.swalService.warning(
                "เกิดข้อผิดพลาด",
                error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
              );
            }
          });
      });
  }

  openDenyModal() {
    this.IS_DENY_TICKET.set(true)
  }

  closeDenyModal() {
    this.IS_DENY_TICKET.set(false);
  }

  submitDeny(data: any) {
    const ticket = this.selectedTicket();
    const ticketId = ticket?.ticketId;

    if (!ticketId) {
      this.swalService.warning("ไม่พบ Ticket");
      return;
    }
    this.swalService.loading("กำลังบันทึกข้อมูล...");
    this.IS_DENY_TICKET.set(false);

    this.updateTicket('deny', ticketId, '', null, data.reason)
      .subscribe({
        next: (res) => {
          if (!res?.success) {
            this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
            return;
          }

          this.swalService.success(res.message || "บันทึกสำเร็จ");

          this.selectTicket(ticketId);
          this.getAllTickets();

        },

        error: (error) => {
          console.error("Acknowledge Ticket Error:", error);

          this.swalService.warning(
            "เกิดข้อผิดพลาด",
            error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
          );
        }
      });

  }

  // -- assign --
  openAssignModal() {
    this.IS_ASSIGN_TICKET.set(true)
    this.selectedAssigneeEmpCodes = [];
    this.assignSearchKeyword = '';
  }

  closeAssignModal() {
    this.IS_ASSIGN_TICKET.set(false)
  }

  submitAssign(data: any) {

    const ticket = this.selectedTicket();
    const ticketId = ticket?.ticketId;

    if (!ticketId) {
      this.msg.warning('ไม่พบ Ticket');
      return;
    }

    if (!data?.assignees || data.assignees.length === 0) {
      this.msg.warning('กรุณาเลือกผู้รับผิดชอบ');
      return;
    }

    const assignees = data.assignees.map((x: any) => ({
      codeempid: x?.id
    }));

    const typeTicket = data?.ticketTypeId;

    this.swalService.loading("กำลังบันทึกข้อมูล...");
    this.IS_ASSIGN_TICKET.set(false);

    this.updateTicket('assign', ticketId, typeTicket, assignees)
      .subscribe({
        next: (res) => {

          if (!res?.success) {
            this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
            return;
          }

          this.swalService.success(res.message || "บันทึกสำเร็จ");

          this.selectTicket(res.ticketId || ticketId);
          this.getAllTickets();

        },

        error: (error) => {
          console.error("Assign Ticket Error:", error);

          this.swalService.warning(
            "เกิดข้อผิดพลาด",
            error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
          );
        }
      });

  }

  // -- close --

  closeTicket() {
    this.swalService.confirm('ยืนยันการปิดงาน')
      .then(result => {
        if (!result.isConfirmed) return;

        const ticket = this.selectedTicket();
        const ticketId = ticket?.ticketId;

        if (!ticketId) {
          this.msg.warning('ไม่พบ Ticket');
          return;
        }

        this.swalService.loading("กำลังบันทึกข้อมูล...");

        this.updateTicket('close', ticketId, '', null, null)
          .subscribe({
            next: (res) => {
              if (!res?.success) {
                this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
                return;
              }

              this.swalService.success(res.message || "บันทึกสำเร็จ");

              this.selectTicket(ticketId);
              this.getAllTickets();

            },

            error: (error) => {
              console.error("Acknowledge Ticket Error:", error);

              this.swalService.warning(
                "เกิดข้อผิดพลาด",
                error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
              );
            }
          });
      });
  }

  // -- note --
  openAddNote() {
    this.IS_NOTE_TICKET.set(true)
  }

  closeAddNoteModal() {
    this.IS_NOTE_TICKET.set(false);
  }

  submitNote(data: any) {
    const formData = new FormData();
    formData.append('Message', data.message);
    formData.append('ExecutedBy', this.authService.userData().CODEMPID);

    data.attachments.forEach((item: any) => {
      if (item?.file instanceof File) {
        formData.append('Files', item.file);
      }
    });
    console.log("formData", [...formData.entries()]);

    this.swalService.loading("กำลังบันทึกข้อมูล...");
    this.IS_NOTE_TICKET.set(false);
    this.itServiceService.replyTicket(data.id, formData).subscribe({
      next: (res) => {

        console.log(res)

        if (!res?.success) {
          this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
          return;
        }

        this.swalService.success(res.message || "บันทึกสำเร็จ");

        this.selectTicket(data.id);
        this.getAllTickets();

      },

      error: (error) => {
        console.error("Assign Ticket Error:", error);

        this.swalService.warning(
          "เกิดข้อผิดพลาด",
          error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
        );
      }
    });

  }
}


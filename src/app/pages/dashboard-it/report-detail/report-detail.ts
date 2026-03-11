import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { ItServiceService } from '../../../services/it-service.service';
import { tickets } from '../../../utils/it-dashboard-mock';
import { FilePreviewItem, FilePreviewModalComponent } from '../../../components/modals/file-preview-modal/file-preview-modal';
import { StatusColor, StatusColor_Reverse, ticketTypyColor } from '../../../utils/status.util';
import dayjs from 'dayjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ActivatedRoute } from '@angular/router';
import { decryptValue } from '../../../utils/crypto.js ';
import { SwalService } from '../../../services/swal.service';
import { AuthService } from '../../../services/auth.service';
import { NoteModal } from "../modal/note-modal/note-modal";
import { DenyModal } from "../modal/deny-modal/deny-modal";
import { AcknowledgeModal } from "../modal/acknowledge-modal/acknowledge-modal";
import { AssignModal } from "../modal/assign-modal/assign-modal";

@Component({
  selector: 'app-report-detail',
  imports: [CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    FilePreviewModalComponent, NoteModal, DenyModal, AcknowledgeModal, AssignModal],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.scss',
})
export class ReportDetail {
  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;
  Tickets = signal<any[]>(tickets)
  selectedTicket = signal<any | undefined>(undefined);

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  isVisibleAssignee = signal<boolean>(false);
  selectedAssignee = signal<any | undefined>(undefined);
  queryId: string = '';

  IS_DENY_TICKET = signal(false);
  IS_ONHOLD_TICKET = signal(false);
  IS_ACKNOWLEDGE_TICKET = signal(false);
  IS_NOTE_TICKET = signal(false);
  IS_ASSIGN_TICKET = signal(false);

  assigneeGroups: any[] = [];
  assignSearchKeyword = '';
  selectedAssigneeEmpCodes: any[] = [];


  constructor(
    private itServiceService: ItServiceService,
    private swalService: SwalService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const encrypted = params['id'];
      console.log("encrypted", encrypted)
      if (encrypted) {
        const decoded = decodeURIComponent(encrypted);
        const bytes = decryptValue(decoded);
        const id = bytes.toString();
        console.log("bytes", bytes)
        console.log("id", id)

        if (id) {
          this.queryId = id;
        }
      }
    });

    this.selectTicket();
    this.getAssignItDropdown();
  }


  getTicketById(ticketId: string) {
    return this.itServiceService.getTicketById(ticketId)
  }

  selectTicket() {
    this.getTicketById(this.queryId).subscribe(async (res: any) => {

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
      const attachments = convertedFiles ?? [];
      const replies = res.replies ?? [];
      const services = res.services ?? [];
      const assignGroups = res.assignGroups ?? [];
      const assignments = res.assignments ?? [];

      const result = this.buildTimeline(res.timeline, res.timelineAssignees);
      console.log("result : ", result);

      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        ticketType: ticket.ticket_type_name_th,
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
        attachments: attachments ?? [],
        itNotes: ticket.requester_code === 'OTD01050',
        assignments: assignments ?? [],
        assignTimeline: result ?? []
      };

      console.log("selectedTicket:", objectData)
      this.selectedTicket.set(objectData);
      this.cdr.detectChanges();
    }
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

  statusLabel(s: string) {
    switch (s) {
      case 'inprogress': return 'In Progress Tickets';
      case 'assigned': return 'Assigned Tickets';
      case 'done': return 'Done';
      case 'open': return 'Open';
      default: return s;
    }
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  isToday(dateValue: string | Date): boolean {
    const date = new Date(dateValue);
    const now = new Date();

    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
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

    const ticket = this.selectedTicket();
    const ticketId = ticket?.ticketId;

    if (!ticketId) {
      this.swalService.warning("ไม่พบ Ticket");
      return;
    }

    if (!data?.ticketTypeId?.tag) {
      this.swalService.warning("กรุณาเลือกประเภท Ticket");
      return;
    }

    const tag = data.ticketTypeId.tag;

    this.swalService.loading("กำลังบันทึกข้อมูล...");
    this.IS_ACKNOWLEDGE_TICKET.set(false);

    this.updateTicket('acknowledge', ticketId, tag, null, null)
      .subscribe({
        next: (res) => {

          if (!res?.success) {
            this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
            return;
          }

          this.swalService.success(res.message || "บันทึกสำเร็จ");

          this.selectTicket();
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
          this.swalService.warning('ไม่พบ Ticket');
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

              this.selectTicket();

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
          this.swalService.warning('ไม่พบ Ticket');
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

              this.selectTicket();
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

          this.selectTicket();

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
      this.swalService.warning('ไม่พบ Ticket');
      return;
    }

    if (!data?.assignees || data.assignees.length === 0) {
      this.swalService.warning('กรุณาเลือกผู้รับผิดชอบ');
      return;
    }

    const assignees = data.assignees.map((x: any) => ({
      codeempid: x?.id?.toLowerCase()
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

          this.selectTicket();

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
          this.swalService.warning('ไม่พบ Ticket');
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

              this.selectTicket();

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
}

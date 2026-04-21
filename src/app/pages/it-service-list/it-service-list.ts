import { Component, signal, inject, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilePreviewModalComponent, FilePreviewItem } from '../../components/modals/file-preview-modal/file-preview-modal';
import { RatingModalComponent } from '../../components/modals/rating-modal/rating-modal';
import dayjs from 'dayjs';
import { ItServiceMockService, Ticket } from '../../services/it-service-mock.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';
import { StatusColor, ticketTypyColor, StatusColor_Reverse } from '../../utils/status.util';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { StatusKey } from '../../interfaces/it-dashboard.interface';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import Swal from 'sweetalert2';
import { NoteModal } from "../dashboard-it/modal/note-modal/note-modal";
import { SwalService } from '../../services/swal.service';
import { formatText } from '../../utils/formatText';
import { ServicesDetailModal } from "../../components/modals/services-detail-modal/services-detail-modal";
import { FileConverterService } from '../../services/file-converter';

@Component({
  selector: 'app-it-service',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, RatingModalComponent, NzSelectModule, NzIconModule, NzButtonModule, NoteModal, ServicesDetailModal],
  templateUrl: './it-service-list.html',
  styleUrl: './it-service-list.scss',
})
export class ItService implements OnInit {
  isLaptop = false;

  @HostListener('window:resize')
  onResize() {
    this.checkScreen();
  }

  checkScreen() {
    const width = window.innerWidth;
    this.isLaptop = width >= 1024 && width <= 1440;
    // console.log("isLabtop, ", width, ' > ', this.isLaptop)
  }

  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private fileConverter = inject(FileConverterService);
  private cdr = inject(ChangeDetectorRef);
  private userData = this.authService.userData()

  formatText = formatText;
  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;

  currentUserEmpCode = this.authService.userData().CODEMPID;

  searchQuery = signal('');

  mockTickets = this.itServiceMock.ticketsSignal;
  Tickets = signal<any[]>([])
  selectedTicket = signal<any | undefined>(undefined);

  isPreviewModalOpen = signal<boolean>(false);
  isRatingModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);
  isVisibleAssignee = signal<boolean>(false);
  selectedAssignee = signal<any | undefined>(undefined);
  IS_NOTE_TICKET = signal(false);
  IS_REOPEN_TICKET = signal(false);

  filterStatus: StatusKey | null = 'all';
  keyword = '';
  convertedFiles: any[] = [];
  attachments: any[] = [];
  deletedAttachmentIds: number[] = [];
  newFiles: any[] = [];
  desNew: string = '';
  ngOnInit() {
    this.getMyTicket();
    this.checkScreen();
  }

  /**
   * 
   * NEW!!
   */
  selectTicket(ticketId: string) {
    // console.log(ticketId)
    this.getTicketById(ticketId).subscribe(async (res: any) => {
      console.log(res)
      const ticketAttachments = res.attachments?.filter((f: any) => !f.reply_id) || [];
      const replyAttachments = res.attachments?.filter((f: any) => f.reply_id) || [];

      const convertedFiles = await this.fileConverter.convertUrlsToFiles(ticketAttachments);

      const ticket = res.ticket;
      const replies = res.replies;
      const services = res.services;
      const attachments = convertedFiles
      const assignGroups = res.assignGroups;
      const assignments = res.assignments;
      this.desNew = ticket.description;

      const itNotes = await this.buildItNotes(replies, replyAttachments);
      const result = this.buildTimeline(res.timeline, res.timelineAssignees);

      // console.log(ticket.IT_Status, ticket.user_status)
      // console.log(ticket.IT_Status === null ? ticket.user_status :
      //   ticket.IT_Status === 'Closed' ? 'Closed' :
      //     ticket.user_status === 'Pending' ? 'Waiting you' :
      //       'In Progress')

      let status = this.getTicketStatus(ticket)


      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.ticket_type_id === 1 ? `ความประสงค์จะซ่อมอุปกรณ์ : ${ticket.device_type_name}\nรายละเอียด : ${ticket.symptom ?? '-'}` : ticket.description,
        ticketType: ticket.ticket_type_name_th,
        ticketTypeId: ticket.ticket_type_id,
        status: status,

        // ticket.IT_Status === null ? ticket.user_status :
        //   ticket.IT_Status === 'Closed' ? 'Closed' :
        //     ticket.user_status === 'Pending' ? 'Waiting you' :
        //       'In Progress',
        title: ticket.title,
        status_user: ticket.user_status,
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
        assignments: assignments,
        itNotes: itNotes,
        assignTimeline: result,
        services: services,
        requester: res.requester,
        openFor: res.requestFor.fullname ? res.requestFor : null
      }

      // console.log("selectedTicket:", objectData)
      this.selectedTicket.set(objectData);
    }
    );
  }

  showAllServices: boolean = false;
  selectedServices: any[] = [];
  showAll(services: any) {
    // console.log(services)
    this.showAllServices = true
    this.selectedServices = services

  }

  closeModal_showAll() {
    this.showAllServices = false;
  }

  selectAssignee(item: any) {
    this.isVisibleAssignee.set(true)
    this.selectedAssignee.set(item)
  }

  closeAssignee() {
    this.isVisibleAssignee.set(false)
  }

  clearSelection() {
    this.selectedTicket.set(undefined);
  }

  openRating() {
    this.isRatingModalOpen.set(true);
  }

  closeRating() {
    this.isRatingModalOpen.set(false);
  }

  handleRate(event: { rating: number, comment: string }) {
    console.log('Rating submitted:', event);
    // Here you would typically call a service to save the rating
    this.closeRating();
  }

  // FUNCTION ACTION
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
        this.getMyTicket()
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

  openReOpen() {
    this.IS_REOPEN_TICKET.set(true)
  }

  closeReOpenModal() {
    this.IS_REOPEN_TICKET.set(false);
  }

  copy(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // console.log('คัดลอกแล้ว');
  }

  // FUNCTION MAP
  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  statusLabel(s: any) {
    // console.log(s)
    switch (s) {
      case 'inprocess': return 'In Progress Tickets';
      case 'assigned': return 'Assigned Tickets';
      case 'done': return 'Done';
      case 'open': return 'Open';
      default: return s;
    }
  }

  mapPriorityColor(priority: string) {
    switch (priority) {
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'orange';
      case 'LOW': return 'green';
      default: return 'gray';
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

    //   const match = name.match(/\((.*?)\)/);
    //   return match ? match[1] : name;

    const nickMatch = name.match(/\((.*?)\)/);
    const firstName = name.split(' ')[0];

    if (nickMatch) {
      return `${firstName} (${nickMatch[1]})`;
    }

    return firstName;
  }

  viewFile(file: any) {
    this.previewFiles.set([this.fileConverter.buildPreviewFile(file)]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  buildTimeline(timelines: any[], assignees: any[]) {
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

        const files = attachments.filter(a => a.reply_id === r.id);
        const convertedFiles = await this.fileConverter.convertUrlsToFiles(files);
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
          },
          referred_title: r.Referred_Title,
          isReferred: r.IsReferred
        };

      })

    );

    return notes;
  }

  getTicketStatus(ticket: any) {
    // console.log(ticket)
    if ((ticket.IT_Status === "Assigned" && ticket.user_status === "Pending") || (ticket.user_status === 'Referred_Back')) {
      return "Waiting you";
    }

    else if (ticket.user_status === "Approved") {
      return "In Progress";
    }

    else if (ticket.user_status !== 'Approved') {
      return ticket.user_status;
    }

    return "Unknown";
  }

  // GET
  getMyTicket() {

    // { requesterCodeempid: this.userData.CODEMPID }
    // { requesterAduser: this.userData.AD_USER }

    this.itServiceService.getMyTickets({ requesterCodeempid: this.userData.CODEMPID }).subscribe({
      next: (res) => {
        this.Tickets.set(res.data.map((ticket: any) => ({
          ...ticket,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          ticketType: ticket.ticket_type_name_th,
          status: this.getTicketStatus(ticket),
          createdDate: new Date(ticket.created_at).toISOString()
        })))
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  getTicketById(ticketId: string) {
    return this.itServiceService.getTicketById(ticketId)
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    this.addFiles(files);

    // reset input เพื่อให้เลือกไฟล์ชื่อเดิมซ้ำได้
    input.value = '';
  }

  private addFiles(files: FileList) {
    const current = this.selectedTicket();
    if (!current) return;

    const newFiles: any[] = Array.from(files).map((f) => ({
      id: null,
      name: f.name,
      size: f.size,
      file: f,
      isNew: true,
      isDeleted: false
    }));

    this.selectedTicket.set({
      ...current,
      attachments: [...current.attachments, ...newFiles]
    });
  }

  removeAttachment(file: any) {

    const current = this.selectedTicket();
    if (!current) return;

    const attachments = current.attachments || [];

    // ถ้าเป็นไฟล์เดิมจาก DB
    if (file.fileId) {
      this.deletedAttachmentIds.push(file.fileId);
    }

    // ลบออกจาก list
    const updatedAttachments = attachments.filter((x: any) => x !== file);

    this.selectedTicket.set({
      ...current,
      attachments: updatedAttachments
    });

    console.log("deletedAttachmentIds:", this.deletedAttachmentIds);
    console.log("attachments:", updatedAttachments);
  }

  Resubmit(ticket: any) {
    Swal.fire({
      title: 'ยืนยันการ Re-Submit ?',
      text: 'คุณต้องการส่ง Ticket นี้ให้หัวหน้า Approve หรือไม่',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#aaa'
    }).then((result) => {
      if (!result.isConfirmed) return;

      const requester = JSON.parse(localStorage.getItem('employee') || '{}');
      const current = this.selectedTicket();
      if (!current) return;

      const formData = new FormData();

      // -------------------------
      // ข้อมูลทั่วไป
      // -------------------------

      formData.append('TicketId', String(current.ticketId));
      formData.append('Requester', requester.CODEMPID ?? '');
      formData.append('TicketNumber', current.ticketNumber ?? '');
      formData.append('Description', current.description ?? '');

      const newFiles = (current.attachments || []).filter((x: any) => x.isNew && x.file);
      newFiles.forEach((item: any) => {
        formData.append('NewFiles', item.file, item.name);
      });

      (this.deletedAttachmentIds || []).forEach((id: number) => {
        formData.append('DeletedAttachmentIds', String(id));
      });

      console.log('===== REOPEN FORM DATA =====');
      for (const pair of (formData as any).entries()) {
        console.log(pair[0], pair[1]);
      }
      // ยิงจริง
      this.itServiceService.re_open(formData).subscribe({
        next: (res) => {
          console.log('re_open success:', res);

          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'Re-Submit Ticket สำเร็จ',
            timer: 1500,
            showConfirmButton: false
          });

          this.deletedAttachmentIds = [];
          this.getMyTicket();
          this.selectTicket(current.ticketId.toString());
        },
        error: (error) => {
          console.error('Error Re-Open:', error);

          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถ Re-Submit ได้'
          });
        }
      });
    });
  }
}

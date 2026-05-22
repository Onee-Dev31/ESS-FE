import {
  Component,
  signal,
  inject,
  ChangeDetectorRef,
  OnInit,
  HostListener,
  DestroyRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FilePreviewModalComponent,
  FilePreviewItem,
} from '../../components/modals/file-preview-modal/file-preview-modal';
import { RatingModalComponent } from '../../components/modals/rating-modal/rating-modal';
import dayjs from 'dayjs';
import { ItServiceMockService, Ticket } from '../../services/it-service-mock.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';
import {
  StatusColor,
  ticketTypyColor,
  StatusColor_Reverse,
  StatusColor_text,
} from '../../utils/status.util';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { StatusKey } from '../../interfaces/it-dashboard.interface';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import Swal from 'sweetalert2';
import { NoteModal } from '../dashboard-it/modal/note-modal/note-modal';
import { SwalService } from '../../services/swal.service';
import { formatText } from '../../utils/formatText';
import { ServicesDetailModal } from '../../components/modals/services-detail-modal/services-detail-modal';
import { FileConverterService } from '../../services/file-converter';
import { SignalrService } from '../../services/signalr.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { CcModal } from '../dashboard-it/modal/cc-modal/cc-modal';
import { ReOpenModal } from '../dashboard-it/modal/re-open-modal/re-open-modal';
import { AvatarPreviewModal } from '../../components/modals/avatar-preview-modal/avatar-preview-modal';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
@Component({
  selector: 'app-it-service',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FilePreviewModalComponent,
    RatingModalComponent,
    NzSelectModule,
    NzIconModule,
    NzButtonModule,
    NoteModal,
    ServicesDetailModal,
    NzTooltipModule,
    NzModalModule,
    CcModal,
    ReOpenModal,
    AvatarPreviewModal,
    NzDatePickerModule,
  ],
  templateUrl: './it-service-list.html',
  styleUrl: './it-service-list.scss',
})
export class ItService implements OnInit {
  isLaptop = false;
  isMobile = false;
  isSmallMobile = false;
  isTicketDetailOpen = signal(false);
  IS_CHAT_OPEN = signal(false);
  chatMessage = '';
  chatAttachments: { name: string; size: number; file: File }[] = [];

  readonly CHAT_FILE_CONFIG = {
    maxFiles: 5,
    maxSizeMB: 5,
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'xls'],
  };

  @HostListener('window:resize')
  onResize() {
    this.checkScreen();
    this.checkMobile();
  }

  checkScreen() {
    const width = window.innerWidth;
    this.isLaptop = width >= 1024 && width <= 1440;
  }
  checkMobile() {
    this.isMobile = window.innerWidth <= 860;
    this.isSmallMobile = window.innerWidth <= 460;
  }

  @ViewChild('cardBody') cardBodyEl?: ElementRef<HTMLElement>;

  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private fileConverter = inject(FileConverterService);
  private signalrService = inject(SignalrService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userData = this.authService.userData();

  formatText = formatText;
  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;
  StatusColor_text = StatusColor_text;

  currentUserEmpCode = this.authService.userData().CODEMPID;

  searchQuery = signal('');

  mockTickets = this.itServiceMock.ticketsSignal;
  Tickets = signal<any[]>([]);
  selectedTicket = signal<any | undefined>(undefined);
  highlightedTicketId = signal<number | null>(null);
  newNoteTicketIds = signal<Set<number>>(new Set());
  highlightedNoteTicketId = signal<number | null>(null);

  isPreviewModalOpen = signal<boolean>(false);
  isRatingModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);
  isVisibleAssignee = signal<boolean>(false);
  selectedAssignee = signal<any | undefined>(undefined);
  IS_NOTE_TICKET = signal(false);
  IS_REOPEN_TICKET = signal(false);

  filterStatus: any | null = 'all';
  keyword = '';
  convertedFiles: any[] = [];
  attachments: any[] = [];
  deletedAttachmentIds: number[] = [];
  newFiles: any[] = [];
  desNew: string = '';

  dateRange: Date[] | null = null;
  showFilter = false;

  pendingTicketId = '';

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const ticketId = params.get('ticket') || '';
      if (ticketId) this.pendingTicketId = ticketId;
    });
  }

  ngOnInit() {
    this.getMyTicket();
    this.checkScreen();
    this.checkMobile();

    (this.route.queryParams ?? EMPTY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const ticketId = params['ticketId'];
        if (ticketId) {
          const id = Number(ticketId);
          this.highlightedTicketId.set(id);
          this.newNoteTicketIds.update((s) => {
            s.delete(id);
            return new Set(s);
          });
          this.selectTicket(ticketId);

          // ✅ Scroll to ticket in sidebar (with retry logic)
          const scrollToTicket = (id: string, retries = 10) => {
            const el = document.getElementById('ticket-' + id);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (retries > 0) {
              setTimeout(() => scrollToTicket(id, retries - 1), 300);
            }
          };
          scrollToTicket(ticketId);

          setTimeout(() => this.highlightedTicketId.set(null), 8000);
        }
      });

    this.signalrService.ticketFocusTrigger
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ticketId) => {
        this.newNoteTicketIds.update((s) => {
          s.delete(ticketId);
          return new Set(s);
        });
        this.highlightedTicketId.set(ticketId);
        this.highlightedNoteTicketId.set(ticketId);
        this.selectTicket(String(ticketId));
        const scrollToTicket = (id: string, retries = 10) => {
          const el = document.getElementById('ticket-' + id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          else if (retries > 0) setTimeout(() => scrollToTicket(id, retries - 1), 300);
        };
        scrollToTicket(String(ticketId));
        setTimeout(() => this.highlightedTicketId.set(null), 8000);
        setTimeout(() => this.highlightedNoteTicketId.set(null), 5000);
      });

    this.signalrService.ticketStatusTrigger
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ ticketId, status }) => this.applyStatusChange(ticketId, status));

    this.signalrService
      .on('TicketStatusChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.applyStatusChange(data.ticketId, data.status));

    // ✅ Listen for New Note (Real-time)
    this.signalrService
      .on('NewNote')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (data.ticketId) {
          // 1. Show "New Message" badge on the left list
          this.newNoteTicketIds.update((s) => new Set([...s, Number(data.ticketId)]));

          // 2. If viewing this ticket, refresh details to show new note instantly
          if (this.selectedTicket()?.ticketId === data.ticketId) {
            this.selectTicket(String(data.ticketId));
          }
        }
      });
  }

  private applyStatusChange(ticketId: any, rawStatus: string) {
    const [itStatus, detail] = (rawStatus ?? '').split('|').map((s) => s.trim());

    // this.Tickets.update((list) =>
    //   list.map((t) => {
    //     if (t.ticketId != ticketId) return t;
    //     const updated: any = { ...t, IT_Status: itStatus };
    //     console.log(updated);
    //     // if (itStatus === 'In Progress' && detail) {
    //     //   updated.ticketType = detail;
    //     //   updated.status = 'Waiting you';
    //     // } else if (itStatus === 'Rejected') {
    //     //   updated.status = 'Rejected';
    //     // } else if (itStatus === 'Referred_Back') {
    //     //   updated.status = 'Referred Back';
    //     // } else if (itStatus === 'Approved') {
    //     //   updated.status = 'Approved';
    //     // } else if (itStatus === 'ReOpened') {
    //     //   updated.status = 'Re-Opened';
    //     //   updated.user_status = 'ReOpened';
    //     // } else {
    //     // แก้เรื่อง Waiting_approve
    //     updated.status = this.getTicketStatus(updated);
    //     // }
    //     return updated;
    //   }),
    // );
    this.getMyTicket();
    this.selectTicket(ticketId); //เพราะต้องเรียก progress ด้านขวา
    // if (this.selectedTicket()?.ticketId == ticketId) {
    //   this.selectedTicket.update((t) => ({ ...t, IT_Status: status, status }));
    // }
  }

  showRequesterContact = false;
  /**
   *
   * NEW!!
   */
  onTicketClick(ticketId: number) {
    this.newNoteTicketIds.update((s) => {
      s.delete(ticketId);
      return new Set(s);
    });
    this.selectTicket(String(ticketId));
  }

  selectTicket(ticketId: string) {
    const previousTicketId = this.selectedTicket()?.ticketId;

    this.getTicketById(ticketId).subscribe(async (res: any) => {
      console.log(res);
      const ticketAttachments = res.attachments?.filter((f: any) => !f.reply_id) || [];
      const replyAttachments = res.attachments?.filter((f: any) => f.reply_id) || [];

      const convertedFiles = await this.fileConverter.convertUrlsToFiles(ticketAttachments);

      const ticket = res.ticket;
      const replies = res.replies;
      const services = res.services;
      const attachments = convertedFiles;
      const assignGroups = res.assignGroups;
      const assignments = res.assignments;
      const ccList = res.ccList;
      this.desNew = ticket.description;

      const itNotes = await this.buildItNotes(replies, replyAttachments);
      const result = this.buildTimeline(res.timeline, res.timelineAssignees);
      let status = this.getTicketStatus(ticket);

      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        ticketType: ticket.ticket_type_name_th,
        ticketTypeId: ticket.ticket_type_id,
        status: status,
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
        openFor: res.requestFor.fullname ? res.requestFor : null,
        rejection_reason: ticket.rejection_reason,
        ccList: ccList,
      };

      // console.log(objectData);

      this.selectedTicket.set(objectData);
      if (previousTicketId !== objectData.ticketId) {
        this.clearChatDraft();
      }
      this.scrollToBottom();

      const codeempid = this.authService.userData()?.CODEMPID;
      if (ticketId && codeempid) {
        this.itServiceService.markTicketRead(ticketId, codeempid).subscribe({
          complete: () => this.signalrService.ticketReadTrigger.next({ ticketId }),
        });
      }

      if (this.isMobile) {
        this.isTicketDetailOpen.set(true);
      }
    });
  }

  closeTicketDetail() {
    this.isTicketDetailOpen.set(false);
    this.closeChat();
  }

  toggleChat() {
    this.IS_CHAT_OPEN.update((isOpen) => {
      const next = !isOpen;
      if (next) {
        this.scrollToBottom();
      }
      return next;
    });
  }

  closeChat() {
    this.IS_CHAT_OPEN.set(false);
  }

  canSendChat(ticket: any) {
    return (
      ticket?.status !== 'Closed' &&
      ticket?.status_user !== 'Referred_Back' &&
      ticket?.status_user !== 'Denied' &&
      ticket?.status_user !== 'Hold'
    );
  }

  sendChatMessage(ticket: any) {
    const message = this.chatMessage.trim();

    if (!message) {
      this.swalService.warning('กรุณากรอกข้อความ');
      return;
    }

    const attachments = [...this.chatAttachments];
    this.chatMessage = '';
    this.chatAttachments = [];
    this.submitNote({
      id: ticket.ticketId,
      message,
      attachments,
    });
  }

  handleChatEnter(event: Event, ticket: any) {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    this.sendChatMessage(ticket);
  }

  onChatFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addChatFiles(input.files);
    }
    input.value = '';
  }

  removeChatAttachment(index: number) {
    this.chatAttachments.splice(index, 1);
  }

  private clearChatDraft() {
    this.chatMessage = '';
    this.chatAttachments = [];
  }

  private addChatFiles(files: FileList) {
    if (!files || files.length === 0) return;

    const errors: string[] = [];
    const validFiles: { name: string; size: number; file: File }[] = [];

    for (const file of Array.from(files)) {
      const reasons: string[] = [];

      if (this.chatAttachments.length + validFiles.length >= this.CHAT_FILE_CONFIG.maxFiles) {
        reasons.push(`เกินจำนวนสูงสุด ${this.CHAT_FILE_CONFIG.maxFiles} ไฟล์`);
      }

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > this.CHAT_FILE_CONFIG.maxSizeMB) {
        reasons.push(`ขนาดเกิน ${this.CHAT_FILE_CONFIG.maxSizeMB} MB`);
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (
        !this.CHAT_FILE_CONFIG.allowedTypes.includes(file.type) &&
        !this.CHAT_FILE_CONFIG.allowedExtensions.includes(ext)
      ) {
        reasons.push('ประเภทไฟล์ไม่รองรับ');
      }

      if (reasons.length > 0) {
        errors.push(`${file.name} (${reasons.join(', ')})`);
        continue;
      }

      validFiles.push({ name: file.name, size: file.size, file });
    }

    if (errors.length > 0) {
      this.swalService.warning(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      this.chatAttachments = [...this.chatAttachments, ...validFiles];
    }
  }

  showAllServices: boolean = false;
  selectedServices: any[] = [];
  showAll(services: any) {
    // console.log(services)
    this.showAllServices = true;
    this.selectedServices = services;
  }

  closeModal_showAll() {
    this.showAllServices = false;
  }

  selectAssignee(item: any) {
    this.isVisibleAssignee.set(true);
    // console.log(item);
    this.selectedAssignee.set(item);
  }

  closeAssignee() {
    this.isVisibleAssignee.set(false);
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

  handleRate(event: { rating: number; comment: string }) {
    // console.log('Rating submitted:', event);
    // Here you would typically call a service to save the rating
    this.closeRating();
  }

  // FUNCTION ACTION
  openAddNote() {
    this.IS_NOTE_TICKET.set(true);
  }

  closeAddNoteModal() {
    this.IS_NOTE_TICKET.set(false);
  }

  submitNote(data: any) {
    const formData = new FormData();
    formData.append('Message', data.message);
    formData.append('ExecutedBy', this.authService.userData().CODEMPID);

    (data.attachments ?? []).forEach((item: any) => {
      if (item?.file instanceof File) {
        formData.append('Files', item.file);
      }
    });
    // console.log('formData', [...formData.entries()]);

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.IS_NOTE_TICKET.set(false);
    this.itServiceService.replyTicket(data.id, formData).subscribe({
      next: (res) => {
        // console.log(res);

        if (!res?.success) {
          this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
          return;
        }

        this.swalService.close();

        setTimeout(() => {
          this.swalService.success(res.message || 'บันทึกสำเร็จ');
        }, 100);

        const ticket = this.selectedTicket();
        const requesterAdUser = ticket?.requesterAduser;
        const userData = this.authService.userData();
        const senderAdUser = this.authService.currentUser() ?? '';
        const senderName = `${userData?.NAMFIRSTT ?? ''} ${userData?.NAMLASTT ?? ''}`.trim();
        if (data.id && requesterAdUser && senderAdUser) {
          this.signalrService.noteNotify(
            data.id,
            requesterAdUser,
            senderAdUser,
            senderName,
            data.message,
          );
        }

        this.selectTicket(data.id);
        this.getMyTicket();
      },

      error: (error) => {
        console.error('Assign Ticket Error:', error);

        this.swalService.warning(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
        );
      },
    });
  }

  ReOpen() {
    this.IS_REOPEN_TICKET.set(true);
  }

  closeReOpenModal() {
    this.IS_REOPEN_TICKET.set(false);
  }

  submitReOpen(data: any) {
    // console.log(data);
    const formData = new FormData();

    formData.append('TicketId', data.ticket.ticketId);
    formData.append('Requester', this.authService.userData().CODEMPID ?? '');
    if (data.reason) {
      formData.append('Description', data.reason ?? '');
    }
    console.log('formData', [...formData.entries()]);
    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.itServiceService.re_open(formData).subscribe({
      next: (res) => {
        this.applyStatusChange(data.ticket.ticketId, 'ReOpened');

        const adUser = (this.authService.userData().AD_USER ?? '').toLowerCase();
        const fullName =
          this.authService.userData().NAMFIRSTE +
          ' ' +
          (this.authService.userData().NAMLASTE ?? '');
        const note = data.reason ? `Re-Open Ticket: ${data.reason}` : 'Re-Open Ticket';
        this.signalrService.noteNotify(data.ticket.ticketId, adUser, adUser, fullName, note);

        setTimeout(() => {
          this.swalService.success(res.message || 'บันทึกสำเร็จ');
        }, 100);
        this.getMyTicket();
        this.selectTicket(data.ticket.ticketId);
        this.closeReOpenModal();
      },
      error: (error) => {
        console.error('Error Re-open:', error.error);
      },
    });
  }

  isDetailModalOpen = signal(false);
  selectedDetail = signal('');

  openDetail(description: string) {
    this.selectedDetail.set(description);
    this.isDetailModalOpen.set(true);
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
      case 'inprocess':
        return 'In Progress Tickets';
      case 'assigned':
        return 'Assigned Tickets';
      case 'done':
        return 'Done';
      case 'open':
        return 'Open';
      default:
        return s;
    }
  }

  mapPriorityColor(priority: string) {
    switch (priority) {
      case 'HIGH':
        return 'red';
      case 'MEDIUM':
        return 'orange';
      case 'LOW':
        return 'green';
      default:
        return 'gray';
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

  private extractNickName(name: string) {
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

  getFileIcon(fileName: string): string {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: 'fas fa-file-pdf',
      jpg: 'fas fa-file-image',
      jpeg: 'fas fa-file-image',
      png: 'fas fa-file-image',
      gif: 'fas fa-file-image',
      doc: 'fas fa-file-word',
      docx: 'fas fa-file-word',
      xls: 'fas fa-file-excel',
      xlsx: 'fas fa-file-excel',
    };
    return iconMap[ext ?? ''] ?? 'fas fa-file';
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  openAllAttachments(files: any) {
    // console.log(files);
    this.previewFiles.set(this.fileConverter.buildPreviewFiles(files));
    this.isPreviewModalOpen.set(true);
  }

  buildTimeline(timelines: any[], assignees: any[]) {
    return timelines.map((t) => {
      const assigneeList = assignees
        .filter((a) => a.timeline_id === t.timeline_id)
        .map((a) => ({
          id: a.id,
          fullName: a.full_name,
          nickName: a.nickname,
          empCode: a.codeempid,
          adUser: a.aduser,
          email: a.email,
          phone: a.phone,
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
          adUser: t.created_by_aduser,
        },

        createdDate: new Date(t.created_at).toISOString(),
      };
    });
  }

  async buildItNotes(replies: any[], attachments: any[]) {
    const notes = await Promise.all(
      replies.map(async (r) => {
        const files = attachments.filter((a) => a.reply_id === r.id);
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
            role: 'user',
          },
          referred_title: r.Referred_Title,
          isReferred: r.IsReferred,
        };
      }),
    );

    return notes;
  }

  scrollToBottom() {
    setTimeout(() => {
      const el = this.cardBodyEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  getTicketStatus(ticket: any) {
    if (
      (ticket.IT_Status === 'Assigned' &&
        ticket.user_status === 'Pending' &&
        ticket.repair_cost_type === 'paid') ||
      (ticket.IT_Status === 'Assigned' &&
        ticket.user_status === 'Pending' &&
        ticket.repair_cost_type !== 'free') || //it เปลี่ยน type request
      ticket.user_status === 'Referred_Back'
    ) {
      return 'Waiting you';
    } else if (
      ticket.IT_Status === 'Assigned' &&
      ticket.user_status === 'Pending' &&
      ticket.repair_cost_type === 'free'
    ) {
      return 'In Progress';
    } else if (ticket.user_status === 'Approved') {
      return 'In Progress';
    } else if (ticket.IT_Status === 'In Progress') {
      return 'In Progress';
    } else if (ticket.IT_Status === 'Hold') {
      return 'Hold';
    } else if (ticket.IT_Status === 'Closed') {
      return 'Closed';
    } else if (ticket.user_status !== 'Approved' && ticket.user_status === 'ReOpened') {
      return 'Re-Opened';
    } else if (ticket.user_status !== 'Approved') {
      return ticket.user_status;
    }

    return 'Unknown';
  }

  onFilterStatusChange(status: string) {
    this.filterStatus = status;
    this.filteredTickets();
  }

  filter = {
    dateRange: null as [Date, Date] | null,
    // dateRange: [dayjs().subtract(3, 'month').toDate(), dayjs().toDate()] as [Date, Date] | null,
  };

  private keywordSearchTimer: ReturnType<typeof setTimeout> | null = null;
  onKeywordChange(value: string) {
    this.keyword = value;

    if (this.keywordSearchTimer) {
      clearTimeout(this.keywordSearchTimer);
    }

    this.keywordSearchTimer = setTimeout(() => {
      this.getMyTicket();
    }, 300);
  }

  filteredTickets(): any[] {
    const statusMap: Record<string, string> = {
      open: 'New',
      reopen: 'Re-Opened',
      waiting: 'Waiting you',
      assigned: 'In Progress',
      done: 'Closed',
      hold: 'Hold',
      denied: 'Denied',
    };

    const mappedStatus = statusMap[this.filterStatus ?? ''];

    return this.Tickets().filter((t: any) => {
      const matchStatus = this.filterStatus === 'all' ? true : t.status === mappedStatus;
      return matchStatus;
    });
  }

  // GET
  getMyTicket() {
    // { requesterCodeempid: this.userData.CODEMPID }
    // { requesterAduser: this.userData.AD_USER }

    const searchText = this.keyword.trim();
    const [from, to] = this.filter.dateRange ?? [];
    const dateFrom = from ? dayjs(from).format('YYYY-MM-DD') : undefined;
    const dateTo = to ? dayjs(to).format('YYYY-MM-DD') : undefined;

    // console.log({
    //   searchText: searchText || undefined,
    //   requesterAduser: this.userData.AD_USER,
    //   dateFrom,
    //   dateTo,
    // });

    this.itServiceService
      .getMyTickets({
        searchText: searchText || undefined,
        requesterAduser: this.userData.AD_USER,
        dateFrom,
        dateTo,
      })
      .subscribe({
        next: (res) => {
          // console.log(res);
          this.Tickets.set(
            res.data.map((ticket: any) => ({
              ...ticket,
              ticketId: ticket.id,
              ticketNumber: ticket.ticket_number,
              ticketType: ticket.ticket_type_name_th,
              status: this.getTicketStatus(ticket),
              createdDate: new Date(ticket.created_at).toISOString(),
            })),
          );

          if (this.pendingTicketId) {
            const pending = this.pendingTicketId;
            this.pendingTicketId = '';
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {},
              replaceUrl: true,
            });

            const matched = this.Tickets().find(
              (t) => t.ticketNumber === pending || String(t.ticketId) === pending,
            );
            if (matched) {
              setTimeout(() => {
                this.selectTicket(String(matched.ticketId));
                this.cdr.detectChanges();

                const scrollToTop = (id: string, retries = 10) => {
                  const el = document.getElementById('ticket-' + id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else if (retries > 0) {
                    setTimeout(() => scrollToTop(id, retries - 1), 200);
                  }
                };
                scrollToTop(String(matched.ticketId));
              }, 300);
            }
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        },
      });
  }

  getTicketById(ticketId: string) {
    return this.itServiceService.getTicketById(ticketId);
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
      isDeleted: false,
    }));

    this.selectedTicket.set({
      ...current,
      attachments: [...current.attachments, ...newFiles],
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
      attachments: updatedAttachments,
    });

    // console.log('deletedAttachmentIds:', this.deletedAttachmentIds);
    // console.log('attachments:', updatedAttachments);
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
      cancelButtonColor: '#aaa',
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

      // console.log('===== REOPEN FORM DATA =====');
      for (const pair of (formData as any).entries()) {
        // console.log(pair[0], pair[1]);
      }
      // ยิงจริง

      this.swalService.loading('กำลังบันทึกข้อมูล...');
      this.itServiceService.re_submit(formData).subscribe({
        next: (res) => {
          const codeEmpId = requester.CODEMPID ?? '';
          if (codeEmpId && current.ticketNumber) {
            this.signalrService.recentlySubmittedTickets.add(current.ticketNumber);
            setTimeout(
              () => this.signalrService.recentlySubmittedTickets.delete(current.ticketNumber),
              10000,
            );
            this.signalrService.ticketApprovalNotify(codeEmpId, current.ticketNumber);
          }

          this.swalService.success('สำเร็จ', 'Re-Submit Ticket สำเร็จ');

          this.deletedAttachmentIds = [];
          this.getMyTicket();
          this.selectTicket(current.ticketId.toString());
        },
        error: (error) => {
          console.error('Error Re-Open:', error);

          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถ Re-Submit ได้',
          });
        },
      });
    });
  }

  isCcModalVisible = false;

  openCcModal(): void {
    this.isCcModalVisible = true;
  }

  handleCancel(): void {
    this.isCcModalVisible = false;
  }
}

import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal,
  effect,
  untracked,
  HostListener,
  DestroyRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
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
import {
  StatusColor,
  ticketTypyColor,
  StatusColor_Reverse,
  StatusColor_text,
  getStatusLabel,
} from '../../utils/status.util';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { ItProblemReportComponent } from '../it-problem-report/it-problem-report';
import { ItRepairRequestComponent } from '../it-repair-request/it-repair-request';
import { ITServiceRequestComponent } from '../it-service-request/it-service-request';
import { SwalService } from '../../services/swal.service';
import { tickets } from '../../utils/it-dashboard-mock';
import { AcknowledgeModal } from './modal/acknowledge-modal/acknowledge-modal';
import { DenyModal } from './modal/deny-modal/deny-modal';
import { AssignModal } from './modal/assign-modal/assign-modal';
import { NoteModal } from './modal/note-modal/note-modal';
import { DateUtilityService } from '../../services/date-utility.service';
import { formatText } from '../../utils/formatText';
import { ServicesDetailModal } from '../../components/modals/services-detail-modal/services-detail-modal';
import { FileConverterService } from '../../services/file-converter';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { SignalrService } from '../../services/signalr.service';
import { CcModal } from './modal/cc-modal/cc-modal';
import { NoteForItModal } from './modal/note-for-it-modal/note-for-it-modal';

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
    ItDashboardSummary,
    FilePreviewModalComponent,
    ItProblemReportComponent,
    ItRepairRequestComponent,
    ITServiceRequestComponent,
    AcknowledgeModal,
    DenyModal,
    AssignModal,
    NoteModal,
    ServicesDetailModal,
    NzCheckboxModule,
    CcModal,
    NoteForItModal,
  ],
  templateUrl: './dashboard-it.html',
  styleUrl: './dashboard-it.scss',
})
export class DashboardIT implements OnInit {
  allDataUserLogin: any = JSON.parse(localStorage.getItem('allData') ?? '{}');

  isTablet = false;
  isMobile = false;
  isSmallMobile = false;
  isTicketDetailOpen = signal(false);

  @ViewChild('cardBody') cardBodyEl?: ElementRef<HTMLElement>;

  @HostListener('window:resize')
  onResize() {
    this.checkScreen();
  }

  checkScreen() {
    const width = window.innerWidth;
    this.isMobile = width <= 860;
    this.isTablet = width > 860 && width <= 1200;
    this.isSmallMobile = window.innerWidth <= 460;
  }

  private itServiceService = inject(ItServiceService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private fileConverter = inject(FileConverterService);
  private signalrService = inject(SignalrService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  dateUtil = inject(DateUtilityService);

  myTicket: boolean = false;

  formatText = formatText;
  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;
  StatusColor_text = StatusColor_text;

  currentUserEmpCode = this.authService.userData().CODEMPID;

  Tickets = signal<any[]>(tickets);
  selectedTicket = signal<any | undefined>(undefined);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  isVisibleAssignee = signal<boolean>(false);
  selectedAssignee = signal<any | undefined>(undefined);

  assigneeGroups: any[] = [];

  IS_OPEN_IT_SERVICE = signal(0);
  newTicketIds = signal<Set<number>>(new Set());
  unreadTicketIds = signal<Set<number>>(new Set());
  newNoteTicketIds = signal<Set<number>>(new Set());
  private prevTicketIds = new Set<number>();

  get newTicketCount() {
    return this.signalrService.pendingNewTickets;
  }
  private initialized = false;
  IS_DENY_TICKET = signal(false);
  IS_ONHOLD_TICKET = signal(false);
  IS_ACKNOWLEDGE_TICKET = signal(false);
  IS_NOTE_TICKET = signal(false);
  IS_ASSIGN_TICKET = signal(false);
  IS_NOTEFORIT_TICKET = signal(false);
  isCcModalVisible = false;

  keyword = '';
  TicketStatus: any;

  filterStatus: string | null = 'all';

  selectedId = 1;
  // isAssignModalVisible = false;
  assignSearchKeyword = '';
  selectedAssigneeEmpCodes: any[] = [];

  constructor(
    private msg: NzMessageService,
    private sanitizer: DomSanitizer,
  ) {
    effect(() => {
      const trigger = this.signalrService.refreshTrigger();
      if (trigger > 0 && this.initialized) {
        untracked(() => this.refreshTickets());
      }
    });
  }

  ngOnInit() {
    this.checkScreen();
    const hasTrigger = this.signalrService.refreshTrigger() > 0;
    this.signalrService.refreshTrigger.set(0);
    const navigatingToTicket = !!this.route.snapshot.queryParamMap.get('ticketId');
    if (!navigatingToTicket && (hasTrigger || this.signalrService.pendingNewTickets() > 0)) {
      this.refreshTickets();
    } else {
      this.getAllTickets();
    }
    this.initialized = true;
    this.getAssignItDropdown();
    (this.route.queryParams ?? EMPTY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['focusZone'] === 'tickets') {
          this.focusTicketsZone();
        }

        if (params['ticketId']) {
          // ✅ Ensure the ticket is visible by resetting filters
          this.filterStatus = 'all';
          this.myTicket = false;
          this.getAllTickets();

          this.selectTicket(params['ticketId']);
        }
      });

    this.signalrService.on('NewTicket', '/it-dashboard');
    this.signalrService.on('TicketAssigned', '/it-dashboard');

    this.signalrService.ticketFocusTrigger
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ticketId) => {
        this.newNoteTicketIds.update((s) => {
          s.delete(ticketId);
          return new Set(s);
        });
        this.selectTicket(String(ticketId));
      });

    // ✅ Listen for New Note (Real-time)
    this.signalrService
      .on('NewNote')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: any) => {
        if (data.ticketId) {
          // 1. Mark as unread (envelope icon + ข้อความใหม่ badge)
          this.unreadTicketIds.update((s) => new Set([...s, data.ticketId]));
          this.newNoteTicketIds.update((s) => new Set([...s, Number(data.ticketId)]));

          // 2. If viewing this ticket, refresh details to show new note instantly
          if (this.selectedTicket()?.ticketId === data.ticketId) {
            this.selectTicket(String(data.ticketId));
          }
        }
      });
  }

  close() {
    this.IS_OPEN_IT_SERVICE.set(0);
  }

  refreshTickets() {
    this.prevTicketIds = new Set(this.Tickets().map((t: any) => t.ticketId));
    this.getAllTickets(true);
  }

  onStatusChange(status: string | null) {
    this.filterStatus = status ?? 'all'; // ✅ ถ้า null → all
    this.filteredTickets();
    // หรือเรียก filterStatus(status) ของคุณ
  }

  onFilterStatusChange(status: string) {
    this.filterStatus = status;
    this.filteredTickets();
  }

  trackById = (_: number, item: TicketItem) => item.id;

  private focusTicketsZone(retries = 10) {
    const zone = document.getElementById('tickets-zone');
    if (zone) {
      zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // blur first so :focus state changes even if element was already focused,
      // ensuring the glow animation replays every time
      zone.blur();
      requestAnimationFrame(() => zone.focus({ preventScroll: true }));
      return;
    }

    if (retries > 0) {
      setTimeout(() => this.focusTicketsZone(retries - 1), 200);
    }
  }

  onTicketClick(ticketId: any) {
    this.newNoteTicketIds.update((s) => {
      s.delete(Number(ticketId));
      return new Set(s);
    });
    this.selectTicket(String(ticketId));
  }

  selectTicket(ticketId: string) {
    this.getTicketById(ticketId).subscribe(async (res: any) => {
      // console.log(res);
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

      const itNotes = await this.buildItNotes(replies, replyAttachments);
      const result = this.buildTimeline(res.timeline, res.timelineAssignees);

      // const status_for_it =
      //   assignments.length === 1 &&
      //   assignments[0].codeempid === this.authService.userData().CODEMPID
      //     ? 'In Progress'
      //     : ticket.IT_Status;

      // console.log(status_for_it);

      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        noteForIt: ticket.noteForIt,
        ticketType: ticket.ticket_type_name_th,
        ticketTypeId: ticket.ticket_type_id,
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
        status: ticket.IT_Status,
        it_satus: getStatusLabel(ticket.IT_Status), //ticket.IT_Status
        approval_status: ticket.approval_status,
        attachments: attachments,
        assignments: assignments,
        itNotes: itNotes,
        assignTimeline: result,
        services: services,
        requester: res.requester,
        openFor: res.requestFor.emp_code ? res.requestFor : null,
        rejection_reason: ticket.rejection_reason,
        ccList: ccList || [],
      };
      this.selectedTicket.set(objectData);
      this.scrollToBottom();

      // console.log(objectData);

      const codeempid = this.authService.userData()?.CODEMPID;
      if (ticketId && codeempid) {
        this.itServiceService.markTicketRead(ticketId, codeempid).subscribe({
          complete: () => this.signalrService.ticketReadTrigger.next({ ticketId }),
        });
        this.unreadTicketIds.update((s) => {
          const next = new Set(s);
          next.delete(Number(ticketId));
          return next;
        });
      }
      if (this.isMobile) {
        this.isTicketDetailOpen.set(true);
      }

      // ✅ Scroll to ticket in sidebar (with retry logic in case list is still loading)
      const scrollToTicket = (id: string, retries = 10) => {
        const el = document.getElementById('ticket-' + id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (retries > 0) {
          setTimeout(() => scrollToTicket(id, retries - 1), 300);
        }
      };
      scrollToTicket(ticketId);
    });
  }

  closeTicketDetail() {
    this.isTicketDetailOpen.set(false);
  }

  showAllServices: boolean = false;
  selectedServices: any[] = [];
  showAll(services: any) {
    this.showAllServices = true;
    this.selectedServices = services;
  }

  closeModal_showAll() {
    this.showAllServices = false;
  }

  selectAssignee(item: any) {
    this.isVisibleAssignee.set(true);
    this.selectedAssignee.set(item);
  }

  closeAssignee() {
    this.isVisibleAssignee.set(false);
  }

  filteredTickets(): any[] {
    const kw = (this.keyword ?? '').trim().toLowerCase();

    const statusMap: any = {
      open: 'Open',
      assigned: 'Assigned',
      inprogress: 'In Progress',
      done: 'Closed',
      hold: 'Hold',
      denied: 'Denied',
    };

    const mappedStatus = statusMap[this.filterStatus ?? ''];

    return this.Tickets().filter((t: any) => {
      const matchStatus = this.filterStatus === 'all' ? true : t.IT_Status === mappedStatus;
      const matchKw = !kw
        ? true
        : t.ticketNumber.toLowerCase().includes(kw) || t.subject.toLowerCase().includes(kw);
      return matchStatus && matchKw;
    });
  }

  statusLabel(s: string) {
    switch (s) {
      case 'inprogress':
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

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  openCcModal(): void {
    this.isCcModalVisible = true;
  }

  handleCancel(): void {
    this.isCcModalVisible = false;
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

  private extractNickName(name: string) {
    const match = name.match(/\((.*?)\)/);

    return match ? match[1] : name;
  }

  viewFile(file: any) {
    this.previewFiles.set([this.fileConverter.buildPreviewFile(file)]);
    this.isPreviewModalOpen.set(true);
  }

  openAllAttachments(files: any) {
    this.previewFiles.set(this.fileConverter.buildPreviewFiles(files));
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
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
          department: t.created_by_department,
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
        };
      }),
    );

    // console.log(notes);
    return notes;
  }

  scrollToBottom() {
    setTimeout(() => {
      const el = this.cardBodyEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  isPreviewable(fileName: string): boolean {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'pdf'].includes(ext ?? '');
  }

  getFileIcon(fileName: string): string {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: 'fas fa-file-pdf',
      jpg: 'fas fa-file-image',
      jpeg: 'fas fa-file-image',
      png: 'fas fa-file-image',
      doc: 'fas fa-file-word',
      docx: 'fas fa-file-word',
      xls: 'fas fa-file-excel',
      xlsx: 'fas fa-file-excel',
      ppt: 'fas fa-file-powerpoint',
      pptx: 'fas fa-file-powerpoint',
      txt: 'fas fa-file-alt',
    };
    return iconMap[ext ?? ''] ?? 'fas fa-file';
  }

  downloadFile(file: any) {
    const url = file.fileUrl || file.filePath;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
  }

  onMyTicketChange() {
    this.getAllTickets();
  }

  // GET MASTER
  getAllTickets(trackNew = false) {
    // console.log(this.myTicket);
    this.itServiceService
      .getAllTickets({
        page: 1,
        pageSize: 50,
        myTicket: this.myTicket ? this.authService.userData().AD_USER : null,
      })
      .subscribe({
        next: (res) => {
          // console.log(res);
          const mapped = res.data.map((ticket: any) => ({
            ...ticket,
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            ticketType: ticket.ticket_type_name_th,
            status: ticket.status,
            IT_Status: getStatusLabel(ticket.IT_Status),
            createdDate: new Date(ticket.created_at).toISOString(),
            requesterEmpId: ticket.requester_code,
            subject: ticket.subject,
          }));
          this.Tickets.set(mapped);
          this.fetchUnreadIds();

          if (trackNew) {
            const pendingNumbers = this.signalrService.pendingTicketNumbers();
            const ids = new Set<number>(
              mapped
                .filter((t: any) =>
                  pendingNumbers.size > 0
                    ? pendingNumbers.has(t.ticketNumber)
                    : !this.prevTicketIds.has(t.ticketId),
                )
                .map((t: any) => t.ticketId),
            );
            this.newTicketIds.set(ids);
            this.signalrService.pendingTicketNumbers.set(new Set());
            this.signalrService.pendingNewTickets.set(0);
            setTimeout(() => this.newTicketIds.set(new Set()), 60000);
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        },
      });
  }

  fetchUnreadIds() {
    const codeempid = this.authService.userData()?.CODEMPID;
    if (!codeempid) return;
    this.itServiceService
      .getUnreadTickets(codeempid, this.authService.userRole() ?? undefined)
      .subscribe({
        next: (res: any) => {
          const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
          this.unreadTicketIds.set(new Set(list.map((t: any) => t.id ?? t.ticketId)));
        },
        error: () => {},
      });
  }

  getTicketById(ticketId: string) {
    return this.itServiceService.getTicketById(ticketId);
  }

  getAssignItDropdown() {
    this.itServiceService.getAssignItDropdown().subscribe({
      next: (res) => {
        const rows = res.data;
        const groupMap: Record<any, any> = {};
        const assigneeGroup: any = [];

        // สร้าง group
        rows.forEach((r: any) => {
          if (r.type === 'GROUP') {
            groupMap[r.id] = {
              name: r.display_name,
              members: [],
            };
          }
        });

        // ใส่ employee
        rows.forEach((r: any) => {
          if (r.type === 'EMPLOYEE' && groupMap[r.group_id]) {
            groupMap[r.group_id].members.push({
              id: r.id,
              name: r.display_name,
              adUser: r.AD_USER,
            });
          }
        });
        // แปลงเป็น array
        Object.values(groupMap).forEach((g) => assigneeGroup.push(g));

        this.assigneeGroups = assigneeGroup;
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  viewApproveResign() {
    window.open(`/resign-management/detail`, '_blank');

    //  window.open(`/it-dashboard/report-detail?id=${encodeURIComponent(encryptedId)}`, '_blank');
  }

  // MODAL
  //>>> function
  updateTicket(
    command: string,
    ticketId: string,
    ticketTypeId?: string,
    assignees?: any,
    comment?: any,
    attachments?: any[],
  ) {
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

    // console.log('formData', [...formData.entries()]);

    return this.itServiceService.updateTicket(ticketId, formData);
  }

  // -- acknowledge --
  openAcknowledgeModal() {
    this.IS_ACKNOWLEDGE_TICKET.set(true);
  }

  closeAcknowledgeModal() {
    this.IS_ACKNOWLEDGE_TICKET.set(false);
  }

  submitAcknowledge(data: any) {
    const ticket = this.selectedTicket();
    const ticketId = ticket?.ticketId;

    if (!ticketId) {
      this.swalService.warning('ไม่พบ Ticket');
      return;
    }

    if (!data?.ticketTypeId) {
      this.swalService.warning('กรุณาเลือกประเภท Ticket');
      return;
    }

    const tag = data.ticketTypeId;

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.IS_ACKNOWLEDGE_TICKET.set(false);

    this.updateTicket('acknowledge', ticketId, tag, null, data.message, data.attachments).subscribe(
      {
        next: (res) => {
          if (!res?.success) {
            this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
            return;
          }

          this.swalService.success(res.message || 'บันทึกสำเร็จ');

          this.signalrService.ticketStatusNotify(
            ticketId,
            ticket?.requesterAduser ?? '',
            'In Progress',
          );

          this.selectTicket(ticketId);
          this.getAllTickets();
        },

        error: (error) => {
          console.error('Acknowledge Ticket Error:', error);

          this.swalService.warning(
            'เกิดข้อผิดพลาด',
            error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
          );
        },
      },
    );
  }

  // -- deny --

  onHoldTicket() {
    this.swalService.confirm('ยืนยันการหยุดชั่วคราว (On Hold)').then((result) => {
      if (!result.isConfirmed) return;

      const ticket = this.selectedTicket();
      const ticketId = ticket?.ticketId;

      if (!ticketId) {
        this.msg.warning('ไม่พบ Ticket');
        return;
      }

      this.swalService.loading('กำลังบันทึกข้อมูล...');

      this.updateTicket('onhold', ticketId, '', null, null).subscribe({
        next: (res) => {
          if (!res?.success) {
            this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
            return;
          }

          this.swalService.success(res.message || 'บันทึกสำเร็จ');

          this.signalrService.ticketStatusNotify(ticketId, ticket?.requesterAduser ?? '', 'Hold');

          this.selectTicket(ticketId);
          this.getAllTickets();
        },

        error: (error) => {
          console.error('Acknowledge Ticket Error:', error);

          this.swalService.warning(
            'เกิดข้อผิดพลาด',
            error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
          );
        },
      });
    });
  }

  resumeTicket() {
    this.swalService.confirm('ยืนยันการกลับมาดำเนินการต่อ (Resume)').then((result) => {
      if (!result.isConfirmed) return;

      const ticket = this.selectedTicket();
      const ticketId = ticket?.ticketId;

      if (!ticketId) {
        this.msg.warning('ไม่พบ Ticket');
        return;
      }

      this.swalService.loading('กำลังบันทึกข้อมูล...');

      this.updateTicket('resume', ticketId, '', null, null).subscribe({
        next: (res) => {
          if (!res?.success) {
            this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
            return;
          }

          this.swalService.success(res.message || 'บันทึกสำเร็จ');

          this.signalrService.ticketStatusNotify(
            ticketId,
            ticket?.requesterAduser ?? '',
            'In Progress',
          );

          this.selectTicket(ticketId);
          this.getAllTickets();
        },

        error: (error) => {
          console.error('Acknowledge Ticket Error:', error);

          this.swalService.warning(
            'เกิดข้อผิดพลาด',
            error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
          );
        },
      });
    });
  }

  openDenyModal() {
    this.IS_DENY_TICKET.set(true);
  }

  closeDenyModal() {
    this.IS_DENY_TICKET.set(false);
  }

  submitDeny(data: any) {
    const ticket = this.selectedTicket();
    const ticketId = ticket?.ticketId;

    if (!ticketId) {
      this.swalService.warning('ไม่พบ Ticket');
      return;
    }
    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.IS_DENY_TICKET.set(false);

    this.updateTicket('deny', ticketId, '', null, data.reason).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
          return;
        }

        this.swalService.success(res.message || 'บันทึกสำเร็จ');

        this.signalrService.ticketStatusNotify(ticketId, ticket?.requesterAduser ?? '', 'Denied');

        this.selectTicket(ticketId);
        this.getAllTickets();
      },

      error: (error) => {
        console.error('Acknowledge Ticket Error:', error);

        this.swalService.warning(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
        );
      },
    });
  }

  // -- assign --
  openAssignModal() {
    this.IS_ASSIGN_TICKET.set(true);
    this.selectedAssigneeEmpCodes = [];
    this.assignSearchKeyword = '';
  }

  closeAssignModal() {
    this.IS_ASSIGN_TICKET.set(false);
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
      codeempid: x?.id,
    }));

    const typeTicket = data?.ticketTypeId;

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.IS_ASSIGN_TICKET.set(false);

    this.updateTicket('assign', ticketId, typeTicket, assignees).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
          return;
        }

        this.swalService.success(res.message || 'บันทึกสำเร็จ');

        const adUsers = data.assignees.map((x: any) => x.adUser).filter((ad: any) => !!ad);
        setTimeout(() => {
          this.signalrService.assignNotify(ticketId, adUsers).subscribe({
            error: () => this.msg.error('ไม่สามารถส่ง Notification ให้ผู้รับผิดชอบได้'),
          });
        }, 500);

        this.signalrService.ticketStatusNotify(ticketId, ticket?.requesterAduser ?? '', 'Assigned');

        this.selectTicket(res.ticketId || ticketId);
        this.getAllTickets();
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

  // -- close --

  closeTicket() {
    this.swalService.confirm('ยืนยันการปิดงาน').then((result) => {
      if (!result.isConfirmed) return;

      const ticket = this.selectedTicket();
      const ticketId = ticket?.ticketId;

      if (!ticketId) {
        this.msg.warning('ไม่พบ Ticket');
        return;
      }

      this.swalService.loading('กำลังบันทึกข้อมูล...');

      this.updateTicket('close', ticketId, '', null, null).subscribe({
        next: (res) => {
          if (!res?.success) {
            this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
            return;
          }

          this.swalService.success(res.message || 'บันทึกสำเร็จ');

          this.signalrService.ticketStatusTrigger.next({ ticketId, status: 'Closed' });
          this.signalrService.ticketStatusNotify(
            ticketId,
            this.selectedTicket()?.requesterAduser ?? '',
            'Closed',
          );

          this.selectTicket(ticketId);
          this.getAllTickets();
        },

        error: (error) => {
          console.error('Acknowledge Ticket Error:', error);

          this.swalService.warning(
            'เกิดข้อผิดพลาด',
            error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
          );
        },
      });
    });
  }

  // -- note --
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

    data.attachments.forEach((item: any) => {
      if (item?.file instanceof File) {
        formData.append('Files', item.file);
      }
    });
    // console.log('formData', [...formData.entries()]);

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.IS_NOTE_TICKET.set(false);
    this.itServiceService.replyTicket(data.id, formData).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
          return;
        }
        this.swalService.close();

        const requesterAdUser = this.selectedTicket()?.requesterAduser;
        const userData = this.authService.userData();
        const senderAdUser = this.authService.currentUser() ?? '';
        const senderName = `${userData?.NAMFIRSTT ?? ''} ${userData?.NAMLASTT ?? ''}`.trim();

        if (requesterAdUser && senderAdUser) {
          this.signalrService.noteNotify(
            data.id,
            requesterAdUser,
            senderAdUser,
            senderName,
            data.message,
          );
        }

        setTimeout(() => {
          this.swalService.success(res.message || 'บันทึกสำเร็จ');
        }, 100);

        this.selectTicket(data.id);
        this.getAllTickets();
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

  isAssigned(): boolean {
    const assignments = this.selectedTicket()?.assignments ?? [];
    return assignments.some(
      (a: any) =>
        a.aduser === this.authService.userData().AD_USER ||
        a.codeempid === this.authService.userData().CODEMPID,
    );
  }

  // -- note for IT --
  openNoteForItModal() {
    // console.log(this.IS_NOTEFORIT_TICKET());
    this.IS_NOTEFORIT_TICKET.set(true);
  }

  closeNoteForItModal() {
    this.IS_NOTEFORIT_TICKET.set(false);
  }

  submitNoteForIt(data: any) {
    const payload = {
      note: data.message,
      updatedBy: this.authService.userData()?.CODEMPID ?? '',
      role: 'it-staff',
    };

    this.itServiceService.updateNoteForIt(data.id, payload).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
          return;
        }
        this.swalService.close();
        this.IS_NOTEFORIT_TICKET.set(false);
        setTimeout(() => {
          this.swalService.success(res.message || 'บันทึกสำเร็จ');
        }, 100);

        this.selectTicket(data.id);
        this.getAllTickets();
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
}

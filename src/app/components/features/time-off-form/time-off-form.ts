import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  inject,
  ChangeDetectorRef,
  SimpleChanges,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast';
import { TimeOffService } from '../../../services/time-off.service';
import {
  LeaveType,
  SaveLeaveRequestPayload,
  TimeOffRequest,
} from '../../../interfaces/time-off.interface';
import { DateUtilityService } from '../../../services/date-utility.service';
import { DialogService } from '../../../services/dialog';
import { STORAGE_KEYS } from '../../../constants/storage.constants';
import {
  ApprovalStep,
  ApprovalStepState,
  ApprovalStepsComponent,
} from '../../shared/approval-steps/approval-steps';
import dayjs from 'dayjs';

import {
  FilePreviewModalComponent,
  FilePreviewItem,
} from '../../modals/file-preview-modal/file-preview-modal';

import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-time-off-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ApprovalStepsComponent,
    FilePreviewModalComponent,
    NzDatePickerModule,
    NzTimePickerModule,
    NzSelectModule,
  ],
  templateUrl: './time-off-form.html',
  styleUrl: './time-off-form.scss',
})
export class TimeOffForm implements OnInit {
  private readonly breakMinutes = 60;
  private readonly shiftStartMinutes = signal(9 * 60);
  private readonly shiftEndMinutes = signal(18 * 60);
  private timeOffService = inject(TimeOffService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);
  private dialogService = inject(DialogService);

  @Input() initialLeaveTypeId: string = '';
  @Input() requestStatus: string = 'NEW';
  @Input() request: TimeOffRequest | null = null;
  @Input() selectedDate: string = '';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  employeeId = signal<string>('');
  requestId = signal<string>('0');
  leaveTypes: LeaveType[] = [];
  selectedLeaveType = signal<string>('');
  reason = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  leavePeriod = signal<string>('full-day');
  shiftStartTime = signal<Date | null>(this.timeFromMinutes(9 * 60));
  shiftEndTime = signal<Date | null>(this.timeFromMinutes(18 * 60));

  startDatePickerValue = computed<Date | null>(() => this.toPickerDate(this.startDate()));
  endDatePickerValue = computed<Date | null>(() => this.toPickerDate(this.endDate()));

  calculatedDays = computed(() => {
    if (this.startDate() && this.endDate()) {
      const calendarDays = this.dateUtil.diffInDays(this.startDate(), this.endDate());
      const startTime = this.shiftStartTime();
      const endTime = this.shiftEndTime();
      if (!startTime || !endTime) return 0.5;

      const requestStart = this.minutesFromTime(startTime);
      const requestEnd = this.minutesFromTime(endTime);

      if (calendarDays > 1) {
        const middleDays = Math.max(0, calendarDays - 2);
        const firstDay = this.calculateDayFraction(requestStart, this.shiftEndMinutes());
        const lastDay = this.calculateDayFraction(this.shiftStartMinutes(), requestEnd);
        return firstDay + middleDays + lastDay;
      }

      return this.calculateDayFraction(requestStart, requestEnd);
    }
    return 1;
  });

  loadingTypes = signal(true);
  attachments = signal<
    {
      id: number;
      fileId?: number;
      name: string;
      description: string;
      file?: File;
      url?: string;
    }[]
  >([]);
  deletedFileIds = signal<number[]>([]);
  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  ngOnInit() {
    this.currentDate.set(this.dateUtil.formatDateToBE(dayjs().toISOString(), 'DD/MM/YYYY'));
    this.employeeId.set(this.getEmployeeCodeFromStorage());

    // ✅ วันที่จาก selectedDate ถ้ามี
    if (this.selectedDate?.trim()) {
      this.startDate.set(this.selectedDate.trim());
      this.endDate.set(this.selectedDate.trim());
    } else {
      this.resetDates();
    }

    this.timeOffService.getQuotaRules().subscribe(({ master }) => {
      this.zone.run(() => {
        this.leaveTypes = master.map((type) => ({
          id: String(type.leave_type_id),
          code: type.leave_code,
          label: type.leave_name_th,
          icon: this.getLeaveTypeIcon(type.leave_code),
          color: this.getLeaveTypeColor(type.leave_code),
        }));
        this.loadingTypes.set(false);
        if (this.initialLeaveTypeId) {
          this.selectLeaveType(this.initialLeaveTypeId);
        }
        if (this.request) {
          this.populateRequest(this.request);
        }

        this.cdr.markForCheck();
      });
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate']) {
      this.setDatesBySelectedDate();
    }
  }

  private setDatesBySelectedDate() {
    const d = this.selectedDate?.trim();
    if (d) {
      this.startDate.set(d);
      this.endDate.set(d);
    } else {
      this.resetDates(); // today
    }
  }

  private resetDates() {
    const today = this.dateUtil.getCurrentDateISO();
    this.startDate.set(today);
    this.endDate.set(today);
  }

  private updateEndDate() {
    const start = this.startDate();
    if (!start) return;

    const period = this.leavePeriod();

    if (period === 'morning' || period === 'afternoon') {
      this.endDate.set(start);
    } else if (period === 'full-day') {
      const end = this.endDate();
      if (!end || dayjs(end).isBefore(dayjs(start))) {
        this.endDate.set(start);
      }
    }
  }

  selectLeaveType(id: string) {
    if (!this.isEditableRequest()) return;
    this.selectedLeaveType.set(id);
    this.cdr.detectChanges();
  }

  onStartDateChange() {
    this.updateEndDate();
  }

  private toPickerDate(value: string): Date | null {
    if (!value) return null;
    const date = dayjs(value);
    return date.isValid() ? date.toDate() : null;
  }

  onStartDatePickerChange(value: Date | null) {
    if (!value) return;
    this.startDate.set(dayjs(value).format('YYYY-MM-DD'));
    this.onStartDateChange();
  }

  onEndDatePickerChange(value: Date | null) {
    if (!value) return;
    this.endDate.set(dayjs(value).format('YYYY-MM-DD'));
  }

  disableEndDate = (date: Date): boolean => {
    const start = this.startDate();
    return !!start && dayjs(date).startOf('day').isBefore(dayjs(start).startOf('day'));
  };

  onLeavePeriodChange(period: string) {
    if (!this.isEditableRequest()) return;
    this.leavePeriod.set(period);
    const firstHalfEnd = this.getFirstHalfEndMinutes();
    const secondHalfStart = firstHalfEnd + this.breakMinutes;

    if (period === 'morning') {
      this.shiftStartTime.set(this.timeFromMinutes(this.shiftStartMinutes()));
      this.shiftEndTime.set(this.timeFromMinutes(firstHalfEnd));
    } else if (period === 'afternoon') {
      this.shiftStartTime.set(this.timeFromMinutes(secondHalfStart));
      this.shiftEndTime.set(this.timeFromMinutes(this.shiftEndMinutes()));
    } else {
      this.shiftStartTime.set(this.timeFromMinutes(this.shiftStartMinutes()));
      this.shiftEndTime.set(this.timeFromMinutes(this.shiftEndMinutes()));
    }
    this.updateEndDate();
  }

  deleteAttachment(id: number) {
    if (!this.isEditableRequest()) return;

    const attachment = this.attachments().find((item) => item.id === id);
    if (attachment?.fileId) {
      this.deletedFileIds.update((current) =>
        current.includes(attachment.fileId!) ? current : [...current, attachment.fileId!],
      );
    }

    this.attachments.update((current) => current.filter((a) => a.id !== id));
  }

  triggerFileInput(input: HTMLInputElement) {
    if (!this.isEditableRequest()) return;
    input.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const currentAttachments = this.attachments();
      const newAttachments = Array.from(input.files).map((file: File, index) => ({
        id: Date.now() + index,
        name: file.name,
        description: '',
        file,
      }));
      this.attachments.update((current) => [...current, ...newAttachments]);
    }
    input.value = '';
  }

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  close() {
    this.onClose.emit();
  }

  openPreview(file: { name: string; url?: string }) {
    this.previewFiles.set([
      {
        fileName: file.name,
        date: this.currentDate(),
        url: file.url,
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  async save() {
    if (!this.selectedLeaveType()) {
      this.toastService.warning('กรุณาเลือกประเภทการลาก่อนดำเนินการต่อ');
      return;
    }

    if (!this.startDate() || !this.endDate()) {
      this.toastService.warning('กรุณาระบุวันที่ลา');
      return;
    }

    if (!this.dateUtil.isValidDateRange(this.startDate(), this.endDate())) {
      this.toastService.warning('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    const startTime = this.shiftStartTime();
    const endTime = this.shiftEndTime();
    if (!startTime || !endTime) {
      this.toastService.warning('กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด');
      return;
    }
    if (
      this.startDate() === this.endDate() &&
      endTime.getHours() * 60 + endTime.getMinutes() <=
        startTime.getHours() * 60 + startTime.getMinutes()
    ) {
      this.toastService.warning('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      return;
    }

    if (!this.reason()) {
      this.toastService.warning('กรุณาระบุเหตุผลการลา');
      return;
    }

    const employeeCode = this.getEmployeeCodeFromStorage();
    if (!employeeCode) {
      this.toastService.warning('ไม่พบรหัสพนักงาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    const isExistingRequest = Number(this.requestId()) > 0;
    const isResubmit = this.isSendbackStatus();
    const actionLabel = isResubmit
      ? 'ส่งคำขอลาอีกครั้ง'
      : isExistingRequest
        ? 'แก้ไขใบลา'
        : 'ส่งใบลา';
    const confirmed = await this.dialogService.confirm({
      title: `ยืนยันการ${actionLabel}`,
      message: `${this.getSelectedLeaveTypeLabel()} • ${this.formatThaiDate(this.startDate())} - ${this.formatThaiDate(this.endDate())} • ${this.calculatedDays()} วัน`,
      confirmText: isResubmit
        ? 'ยืนยันส่งอีกครั้ง'
        : isExistingRequest
          ? 'ยืนยันการแก้ไข'
          : 'ยืนยันส่งใบลา',
      cancelText: 'ยกเลิก',
      type: 'info',
    });

    if (!confirmed) return;

    const startDate = this.toApiDateTime(this.startDate(), this.shiftStartTime());
    const endDate = this.toApiDateTime(this.endDate(), this.shiftEndTime());
    const isHalfDay = this.calculatedDays() % 1 === 0.5;
    const payload: SaveLeaveRequestPayload = {
      action: this.isSendbackStatus() ? 'Resubmit' : 'Upsert',
      request_id: Number(this.requestId()) || 0,
      leave_type_id: Number(this.selectedLeaveType()),
      start_date: startDate,
      end_date: endDate,
      total_days: this.calculatedDays(),
      year: dayjs(this.startDate()).year(),
      reason: this.reason(),
      is_half_day: isHalfDay,
      half_day_period: isHalfDay ? this.getHalfDayPeriod() : 'FULL',
      delete_file_ids: this.deletedFileIds().length ? this.deletedFileIds() : undefined,
      files: this.attachments()
        .map((attachment) => attachment.file)
        .filter((file): file is File => file instanceof File),
      request_by: employeeCode,
    };

    console.log('[Time Off] Save payload:', payload);

    this.timeOffService.saveLeaveRequest(payload).subscribe({
      next: () => {
        this.toastService.success('บันทึกคำขอลาเรียบร้อยแล้ว');
        this.close();
      },
      error: () => this.toastService.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล'),
    });
  }

  private getEmployeeCodeFromStorage(): string {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!storedUser) return localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID)?.trim() ?? '';

    try {
      const user = JSON.parse(storedUser) as { CODEMPID?: string; codeempid?: string };
      return (user.CODEMPID ?? user.codeempid ?? '').trim();
    } catch {
      return localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID)?.trim() ?? '';
    }
  }

  isEditableRequest(): boolean {
    const status = this.normalizeStatus(this.requestStatus);
    return ['NEW', 'SENDBACK', 'SEND_BACK', 'REFERRED_BACK'].includes(status);
  }

  getRequestApprovalSteps(): ApprovalStep[] {
    const request = this.request;
    const overallStatus = this.normalizeStatus(
      request?.overall_status || this.requestStatus || request?.status || '',
    );
    const approver1Action = this.normalizeStatus(request?.approver1_action || 'PENDING');
    const approver2Action = this.normalizeStatus(request?.approver2_action || 'PENDING');
    const hasSecondApprover = Boolean(request?.approver2_code?.trim());
    const isCancelled = ['CANCELLED', 'CANCELED', 'ยกเลิกคำขอ', 'ถูกยกเลิก'].includes(
      overallStatus,
    );
    const isComplete = overallStatus === 'APPROVED';

    const firstApproverState: ApprovalStepState = isCancelled
      ? 'pending'
      : isComplete
        ? 'completed'
        : approver1Action === 'APPROVED'
          ? 'completed'
          : approver1Action === 'REJECTED'
            ? 'rejected'
            : ['SENDBACK', 'SEND_BACK'].includes(approver1Action)
              ? 'sendback'
              : 'active';

    const steps: ApprovalStep[] = [
      { label: 'คำขอใหม่', state: isCancelled ? 'cancelled' : 'completed' },
      {
        label: 'ผู้อนุมัติคนที่ 1',
        state: firstApproverState,
        approverCode: request?.approver1_code || undefined,
        actionReason:
          request?.approver1_comment?.trim() || request?.approver1_reason?.trim() || undefined,
      },
    ];

    if (hasSecondApprover) {
      steps.push({
        label: 'ผู้อนุมัติคนที่ 2',
        approverCode: request?.approver2_code || undefined,
        actionReason:
          request?.approver2_comment?.trim() || request?.approver2_reason?.trim() || undefined,
        state: isCancelled
          ? 'pending'
          : isComplete
            ? 'completed'
            : approver2Action === 'APPROVED'
              ? 'completed'
              : approver2Action === 'REJECTED'
                ? 'rejected'
                : ['SENDBACK', 'SEND_BACK'].includes(approver2Action)
                  ? 'sendback'
                  : approver1Action === 'APPROVED'
                    ? 'active'
                    : 'pending',
      });
    }

    steps.push({
      label: 'อนุมัติแล้ว',
      state: !isCancelled && isComplete ? 'completed' : 'pending',
    });
    return steps;
  }

  getSelectedLeaveTypeLabel(): string {
    return this.leaveTypes.find((type) => type.id === this.selectedLeaveType())?.label ?? '-';
  }

  formatTimeValue(value: Date | null): string {
    if (!value || Number.isNaN(value.getTime())) return '-';
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private isSendbackStatus(): boolean {
    return ['SENDBACK', 'SEND_BACK', 'REFERRED_BACK'].includes(
      this.normalizeStatus(this.requestStatus),
    );
  }

  private normalizeStatus(status: string): string {
    return (status ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }

  private populateRequest(request: TimeOffRequest): void {
    this.deletedFileIds.set([]);
    this.requestId.set(String(request.request_id ?? 0));
    this.selectedLeaveType.set(String(request.leave_type_id ?? ''));
    this.reason.set(request.reason ?? '');
    this.startDate.set(request.startDate.slice(0, 10));
    this.endDate.set(request.endDate.slice(0, 10));
    this.shiftStartTime.set(this.timeFromApiDate(request.startDate));
    this.shiftEndTime.set(this.timeFromApiDate(request.endDate));
    this.attachments.set(
      (request.attachments ?? []).map((file, index) => ({
        id: index + 1,
        fileId: file.file_id,
        name: file.name,
        description: '',
        url: file.url,
      })),
    );

    const period = (request.leavePeriod ?? '').toUpperCase();
    this.leavePeriod.set(
      period === '1ST' || period === 'MORNING'
        ? 'morning'
        : period === '2ND' || period === 'AFTERNOON'
          ? 'afternoon'
          : 'full-day',
    );
  }

  private timeFromApiDate(value: string): Date {
    const match = value?.match(/T(\d{2}):(\d{2})/);
    const result = new Date();
    result.setHours(Number(match?.[1] ?? 9), Number(match?.[2] ?? 0), 0, 0);
    return result;
  }

  private toApiDateTime(date: string, time: Date | null): string {
    const hours = time ? String(time.getHours()).padStart(2, '0') : '00';
    const minutes = time ? String(time.getMinutes()).padStart(2, '0') : '00';
    return `${date}T${hours}:${minutes}:00.000Z`;
  }

  private getFirstHalfEndMinutes(): number {
    const netWorkMinutes = this.shiftEndMinutes() - this.shiftStartMinutes() - this.breakMinutes;
    return this.shiftStartMinutes() + netWorkMinutes / 2;
  }

  private calculateDayFraction(requestStart: number, requestEnd: number): 0.5 | 1 {
    const firstHalfEnd = this.getFirstHalfEndMinutes();
    const secondHalfStart = firstHalfEnd + this.breakMinutes;
    return requestStart < firstHalfEnd && requestEnd > secondHalfStart ? 1 : 0.5;
  }

  private minutesFromTime(time: Date): number {
    return time.getHours() * 60 + time.getMinutes();
  }

  private timeFromMinutes(totalMinutes: number): Date {
    return new Date(1970, 0, 1, Math.floor(totalMinutes / 60), totalMinutes % 60);
  }

  private getHalfDayPeriod(): '1ST' | '2ND' {
    const endTime = this.shiftEndTime();
    const secondHalfStart = this.getFirstHalfEndMinutes() + this.breakMinutes;
    return endTime && this.minutesFromTime(endTime) <= secondHalfStart ? '1ST' : '2ND';
  }

  private getLeaveTypeIcon(code: string): string {
    const icons: Record<string, string> = {
      ANNUAL: 'fas fa-plane-departure',
      SICK: 'fas fa-stethoscope',
      PERSONAL: 'fas fa-briefcase',
      FUNERAL: 'fas fa-ribbon',
    };
    return icons[code] ?? 'fas fa-calendar-day';
  }

  private getLeaveTypeColor(code: string): string {
    const colors: Record<string, string> = {
      ANNUAL: 'var(--danger)',
      SICK: 'var(--primary)',
      PERSONAL: 'var(--warning)',
      FUNERAL: 'var(--success)',
    };
    return colors[code] ?? 'var(--primary)';
  }

  formatThaiDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

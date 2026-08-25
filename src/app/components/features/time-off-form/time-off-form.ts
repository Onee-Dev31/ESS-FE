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
import { LeaveType, SaveLeaveRequestPayload } from '../../../interfaces/time-off.interface';
import { DateUtilityService } from '../../../services/date-utility.service';
import { STORAGE_KEYS } from '../../../constants/storage.constants';
import dayjs from 'dayjs';

import {
  FilePreviewModalComponent,
  FilePreviewItem,
} from '../../modals/file-preview-modal/file-preview-modal';

import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';

@Component({
  selector: 'app-time-off-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FilePreviewModalComponent,
    NzDatePickerModule,
    NzTimePickerModule,
  ],
  templateUrl: './time-off-form.html',
  styleUrl: './time-off-form.scss',
})
export class TimeOffForm implements OnInit {
  private timeOffService = inject(TimeOffService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);

  @Input() initialLeaveTypeId: string = '';
  @Input() requestStatus: string = 'NEW';
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
  shiftStartTime = signal<Date | null>(null);
  shiftEndTime = signal<Date | null>(null);

  startDatePickerValue = computed<Date | null>(() => this.toPickerDate(this.startDate()));
  endDatePickerValue = computed<Date | null>(() => this.toPickerDate(this.endDate()));

  calculatedDays = computed(() => {
    const period = this.leavePeriod();
    if (period === 'morning' || period === 'afternoon') {
      return 0.5;
    }
    if (this.startDate() && this.endDate()) {
      if (period === 'custom') {
        const calendarDays = this.dateUtil.diffInDays(this.startDate(), this.endDate());
        if (calendarDays > 1) return calendarDays;

        const startTime = this.shiftStartTime();
        const endTime = this.shiftEndTime();
        if (!startTime || !endTime) return 0.5;

        const durationMinutes =
          endTime.getHours() * 60 +
          endTime.getMinutes() -
          (startTime.getHours() * 60 + startTime.getMinutes());
        return durationMinutes >= 8 * 60 ? 1 : 0.5;
      }
      return this.dateUtil.diffInDays(this.startDate(), this.endDate());
    }
    return 1;
  });

  loadingTypes = signal(true);
  attachments = signal<{ id: number; name: string; description: string; file: File }[]>([]);
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
    this.leavePeriod.set(period);
    this.updateEndDate();
  }

  deleteAttachment(id: number) {
    this.attachments.update((current) => current.filter((a) => a.id !== id));
  }

  triggerFileInput(input: HTMLInputElement) {
    input.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const currentAttachments = this.attachments();
      const newAttachments = Array.from(input.files).map((file: File, index) => ({
        id: currentAttachments.length + index + 1,
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

  openPreview(file: { name: string }) {
    this.previewFiles.set([
      {
        fileName: file.name,
        date: this.currentDate(),
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  save() {
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

    const startDate = this.toApiDateTime(this.startDate(), this.shiftStartTime());
    const endDate = this.toApiDateTime(this.endDate(), this.shiftEndTime());
    const isHalfDay = this.calculatedDays() % 1 === 0.5;
    const payload: SaveLeaveRequestPayload = {
      action: 'Upsert',
      request_id: Number(this.requestId()) || 0,
      employee_code: employeeCode,
      leave_type_id: Number(this.selectedLeaveType()),
      start_date: startDate,
      end_date: endDate,
      total_days: this.calculatedDays(),
      year: dayjs(this.startDate()).year(),
      reason: this.reason(),
      is_half_day: isHalfDay,
      half_day_period:
        this.leavePeriod() === 'morning'
          ? '1ST'
          : this.leavePeriod() === 'afternoon'
            ? '2ND'
            : this.leavePeriod() === 'custom' && isHalfDay
              ? (this.shiftStartTime()?.getHours() ?? 8) < 12
                ? '1ST'
                : '2ND'
              : 'FULL',
      delete_file_ids: 0,
      files: this.attachments().map((attachment) => attachment.file),
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

  private toApiDateTime(date: string, time: Date | null): string {
    const hours = time ? String(time.getHours()).padStart(2, '0') : '00';
    const minutes = time ? String(time.getMinutes()).padStart(2, '0') : '00';
    return `${date}T${hours}:${minutes}:00.000Z`;
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

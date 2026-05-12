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
import { UserService } from '../../../services/user.service';
import { TimeOffService, TimeOffRequest } from '../../../services/time-off.service';
import { LeaveType } from '../../../interfaces/time-off.interface';
import { DateUtilityService } from '../../../services/date-utility.service';
import dayjs from 'dayjs';

import {
  FilePreviewModalComponent,
  FilePreviewItem,
} from '../../modals/file-preview-modal/file-preview-modal';

import { MasterDataService } from '../../../services/master-data.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

@Component({
  selector: 'app-time-off-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, NzDatePickerModule],
  templateUrl: './time-off-form.html',
  styleUrl: './time-off-form.scss',
})
export class TimeOffForm implements OnInit {
  private timeOffService = inject(TimeOffService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);
  private masterDataService = inject(MasterDataService);

  @Input() initialLeaveTypeId: string = '';
  @Input() requestStatus: string = 'NEW';
  @Input() selectedDate: string = '';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  employeeId = signal<string>('OTD01050');
  requestId = signal<string>('1');
  leaveTypes: LeaveType[] = [];
  selectedLeaveType = signal<string>('');
  reason = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  leavePeriod = signal<string>('full-day');
  shiftStartTime = signal<string>('');
  shiftEndTime = signal<string>('');

  calculatedDays = computed(() => {
    const period = this.leavePeriod();
    if (period === 'morning' || period === 'afternoon') {
      return 0.5;
    }
    if (period === 'custom') {
      return 0;
    }
    if (this.startDate() && this.endDate()) {
      return this.dateUtil.diffInDays(this.startDate(), this.endDate());
    }
    return 1;
  });

  isHalfDayDisabled = computed(() => {
    const selectedType = this.leaveTypes.find((t) => t.id === this.selectedLeaveType());
    return selectedType?.id === 'vacation' || selectedType?.id === 'funeral';
  });
  loadingTypes = signal(true);
  attachments = signal<{ id: number; name: string; description: string }[]>([]);
  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  ngOnInit() {
    this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));

    // ✅ วันที่จาก selectedDate ถ้ามี
    if (this.selectedDate?.trim()) {
      this.startDate.set(this.selectedDate.trim());
      this.endDate.set(this.selectedDate.trim());
    } else {
      this.resetDates();
    }

    this.masterDataService.getLeaveTypes().subscribe((types) => {
      this.zone.run(() => {
        this.leaveTypes = [...(types || [])];
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
    if (this.isHalfDayDisabled()) {
      this.leavePeriod.set('full-day');
    }
    this.cdr.detectChanges();
  }

  onStartDateChange() {
    this.updateEndDate();
  }

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

    if (!this.reason()) {
      this.toastService.warning('กรุณาระบุเหตุผลการลา');
      return;
    }

    const typeLabel = this.leaveTypes.find((t) => t.id === this.selectedLeaveType())?.label || '';

    this.userService.getUserProfile().subscribe((profile) => {
      const request: TimeOffRequest = {
        id: 'NEW',
        createDate: dayjs().toISOString(),
        status: 'NEW',
        employeeId: profile.employeeId,
        requester: {
          employeeId: profile.employeeId,
          name: profile.name,
          department: profile.department,
          company: profile.company,
        },
        leaveType: typeLabel,
        startDate: this.startDate(),
        endDate: this.endDate(),
        reason: this.reason(),
        attachments: this.attachments().map((a) => ({ name: a.name })),
        days: this.calculatedDays(),
        leavePeriod: this.leavePeriod(),
        shiftStartTime: this.shiftStartTime() || '08:00',
        shiftEndTime: this.shiftEndTime() || '17:00',
      };

      this.timeOffService.addRequest(request).subscribe({
        next: () => {
          this.toastService.success('บันทึกคำขอลาเรียบร้อยแล้ว');
          this.close();
        },
        error: () => this.toastService.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล'),
      });
    });
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

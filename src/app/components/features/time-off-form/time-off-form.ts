import { Component, Input, Output, EventEmitter, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../services/alert.service';
import { TimeOffService, TimeOffRequest } from '../../../services/time-off.service';
import { LEAVE_TYPES } from '../../../interfaces/time-off.interface';
import { DateUtilityService } from '../../../services/date-utility.service';
import dayjs from 'dayjs';

@Component({
  selector: 'app-time-off-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-off-form.html',
  styleUrl: './time-off-form.scss'
})
export class TimeOffForm implements OnInit {
  private timeOffService = inject(TimeOffService);
  private alertService = inject(AlertService);
  private dateUtil = inject(DateUtilityService);

  @Input() initialLeaveTypeId: string = '';
  @Input() requestStatus: string = 'คำขอใหม่';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  employeeId = signal<string>('OTD01050');
  requestId = signal<string>('1');
  leaveTypes = LEAVE_TYPES;
  selectedLeaveType = signal<string>('');
  reason = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  leavePeriod = signal<string>('full-day'); // ลาเช้า, ลาบ่าย, ลาเต็มวัน, กำหนดเอง
  shiftStartTime = signal<string>(''); // เวลาเริ่มกะ
  shiftEndTime = signal<string>(''); // เวลาสิ้นสุดกะ

  calculatedDays = computed(() => {
    const period = this.leavePeriod();
    if (period === 'morning' || period === 'afternoon') {
      return 0.5;
    }
    if (period === 'custom') {
      return 0; // Or implement hourly calculation
    }
    // For full-day, calculate from date range
    if (this.startDate() && this.endDate()) {
      return this.dateUtil.diffInDays(this.startDate(), this.endDate());
    }
    return 1;
  });

  isHalfDayDisabled = computed(() => {
    const selectedType = this.leaveTypes.find(t => t.id === this.selectedLeaveType());
    return selectedType?.label === 'ลาพักร้อน' || selectedType?.label === 'ลาเพื่อจัดการงานศพ';
  });

  attachments = signal<{ id: number; name: string; description: string }[]>([]);

  ngOnInit() {
    this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));
    this.resetDates();

    if (this.initialLeaveTypeId) {
      this.selectLeaveType(this.initialLeaveTypeId);
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

    // For half-day, end date = start date
    if (period === 'morning' || period === 'afternoon') {
      this.endDate.set(start);
    }
    // For full-day, keep current end date or set to start date if invalid
    else if (period === 'full-day') {
      const end = this.endDate();
      if (!end || dayjs(end).isBefore(dayjs(start))) {
        this.endDate.set(start);
      }
    }
  }

  selectLeaveType(id: string) {
    this.selectedLeaveType.set(id);
    // If vacation or funeral leave, force full-day
    if (this.isHalfDayDisabled()) {
      this.leavePeriod.set('full-day');
    }
  }

  onStartDateChange() {
    this.updateEndDate();
  }

  onLeavePeriodChange(period: string) {
    this.leavePeriod.set(period);
    this.updateEndDate();
  }

  deleteAttachment(id: number) {
    this.attachments.update(current => current.filter(a => a.id !== id));
  }

  triggerFileInput(input: HTMLInputElement) {
    input.click();
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      const currentAttachments = this.attachments();
      const newAttachments = Array.from(files).map((file: any, index) => ({
        id: currentAttachments.length + index + 1,
        name: file.name,
        description: ''
      }));
      this.attachments.update(current => [...current, ...newAttachments]);
    }
    event.target.value = '';
  }

  close() {
    this.onClose.emit();
  }

  save() {
    if (!this.selectedLeaveType()) {
      this.alertService.showWarning('กรุณาเลือกประเภทการลาก่อนดำเนินการต่อ', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    if (!this.startDate() || !this.endDate()) {
      this.alertService.showWarning('กรุณาระบุวันที่ลา', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    if (!this.dateUtil.isValidDateRange(this.startDate(), this.endDate())) {
      this.alertService.showWarning('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    if (!this.reason()) {
      this.alertService.showWarning('กรุณาระบุเหตุผลการลา', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    const typeLabel = this.leaveTypes.find(t => t.id === this.selectedLeaveType())?.label || '';

    // Create Mock Request
    const request: TimeOffRequest = {
      id: 'NEW',
      createDate: dayjs().toISOString(),
      status: 'คำขอใหม่',
      employeeId: 'EMP001',
      leaveType: typeLabel,
      startDate: this.startDate(),
      endDate: this.endDate(),
      reason: this.reason(),
      attachments: this.attachments().map(a => ({ name: a.name })),
      days: this.calculatedDays(),
      leavePeriod: this.leavePeriod(),
      shiftStartTime: this.shiftStartTime() || '08:00',
      shiftEndTime: this.shiftEndTime() || '17:00'
    };

    this.timeOffService.addRequest(request).subscribe({
      next: () => {
        this.alertService.showSuccess('บันทึกคำขอลาเรียบร้อยแล้ว');
        this.close();
      },
      error: () => this.alertService.showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    });
  }
}

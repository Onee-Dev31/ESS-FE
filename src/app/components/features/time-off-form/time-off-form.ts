import { Component, Input, Output, EventEmitter, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../services/alert.service';
import { TimeOffService, TimeOffRequest } from '../../../services/time-off.service';
import { LEAVE_TYPES } from '../../../interfaces/time-off.interface';

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

  @Input() initialLeaveTypeId: string = '';
  @Input() requestStatus: string = 'คำขอใหม่';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  leaveTypes = LEAVE_TYPES;
  selectedLeaveType = signal<string>('');
  reason = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  leavePeriod = signal<string>('full-day'); // ลาเช้า, ลาบ่าย, ลาเต็มวัน
  shiftStartTime = signal<string>(''); // เวลาเริ่มกะ
  shiftEndTime = signal<string>(''); // เวลาสิ้นสุดกะ

  // คำนวณจำนวนวันลาตามประเภทการลา
  calculatedDays = computed(() => {
    const period = this.leavePeriod();
    if (period === 'morning' || period === 'afternoon') {
      return 0.5;
    }
    return 1;
  });

  attachments = signal<{ id: number; name: string; description: string }[]>([]);

  ngOnInit() {
    this.currentDate.set(this.formatDateToThaiMonth(new Date().toISOString()));
    this.resetDates();

    if (this.initialLeaveTypeId) {
      this.selectLeaveType(this.initialLeaveTypeId);
    }
  }

  private resetDates() {
    this.startDate.set(new Date().toISOString().split('T')[0]);
    this.endDate.set(new Date().toISOString().split('T')[0]);
  }

  private formatDateToThaiMonth(dateStr: string): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  selectLeaveType(id: string) {
    this.selectedLeaveType.set(id);
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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const newId = this.attachments().length > 0 ? Math.max(...this.attachments().map(a => (a as any).id)) + 1 : 1;
        this.attachments.update(current => [...current, {
          id: newId,
          name: file.name,
          description: ''
        }]);
      }
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

    if (!this.reason()) {
      this.alertService.showWarning('กรุณาระบุเหตุผลการลา', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    const typeLabel = this.leaveTypes.find(t => t.id === this.selectedLeaveType())?.label || '';

    // Create Mock Request
    const request: TimeOffRequest = {
      id: 'NEW',
      createDate: new Date().toISOString(),
      status: 'คำขอใหม่',
      employeeId: 'EMP001',
      leaveType: typeLabel,
      startDate: this.startDate(),
      endDate: this.endDate(),
      reason: this.reason(),
      attachments: this.attachments().map(a => ({ name: a.name }))
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

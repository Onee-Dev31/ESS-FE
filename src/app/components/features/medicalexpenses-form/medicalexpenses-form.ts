import { Component, Input, Output, EventEmitter, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalexpensesService } from '../../../services/medicalexpenses.service';
import { MedicalRequest, MedicalItem } from '../../../interfaces/medical.interface';
import { AlertService } from '../../../services/alert.service';
import { DateUtilityService } from '../../../services/date-utility.service';
import dayjs from 'dayjs';

@Component({
  selector: 'app-medicalexpenses-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medicalexpenses-form.html',
  styleUrl: './medicalexpenses-form.scss',
})
export class MedicalexpensesForm implements OnInit {
  private medicalService = inject(MedicalexpensesService);
  private alertService = inject(AlertService);
  private dateUtil = inject(DateUtilityService);

  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  isEditMode = signal<boolean>(false);

  claimTypes = [
    { id: 'opd', label: 'ผู้ป่วยนอก (OPD)', amount: '10,500', icon: 'fas fa-stethoscope', color: '#ff6b6b' },
    { id: 'dental', label: 'ทันตกรรม', amount: '584', icon: 'fas fa-tooth', color: '#4d96ff' },
    { id: 'vision', label: 'สายตา', amount: '876', icon: 'fas fa-glasses', color: '#6bc1ff' },
    { id: 'ipd', label: 'ผู้ป่วยใน', amount: '3,500', icon: 'fas fa-user-md', color: '#6bcb77' },
  ];

  selectedClaimType = signal<string>('');

  hospital = signal<string>('');
  disease = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  amount = signal<number>(0);

  attachments = signal<{ id: number; name: string; description: string }[]>([
    { id: 1, name: 'approval-list-page.005-87d92c90a8cb2e588a7032052d9d94ac.png', description: 'ใบเสร็จยา' },
    { id: 2, name: 'original-aa87c620661b3eb94e5d85441b761387.png', description: 'ใบรับรองแพทย์' }
  ]);

  // เริ่มต้นคอมโพเนนต์: โหลดข้อมูลคำขอหากอยู่ในโหมดแก้ไข
  ngOnInit() {
    if (this.requestId) {
      this.medicalService.getRequestById(this.requestId).subscribe(req => {
        if (req) {
          this.isEditMode.set(true);
          this.currentDate.set(this.dateUtil.formatDateToThaiMonth(req.createDate));

          if (req.items && req.items.length > 0) {
            const item = req.items[0];
            this.hospital.set(item.hospital);
            this.disease.set(item.diseaseType);

            const typeMatch = this.claimTypes.find(t => t.label === item.limitType);
            if (typeMatch) {
              this.selectedClaimType.set(typeMatch.id);
            }

            this.startDate.set(this.dateUtil.formatBEToISO(item.treatmentDateFrom));
            this.endDate.set(this.dateUtil.formatBEToISO(item.treatmentDateTo));
            this.amount.set(item.requestedAmount);
          }
        } else {
          this.isEditMode.set(false);
          this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));
          this.resetDates();
        }
      });
    } else {
      this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));
      this.resetDates();
    }
  }

  private resetDates() {
    const today = this.dateUtil.getCurrentDateISO();
    this.startDate.set(today);
    this.endDate.set(today);
  }

  selectClaimType(id: string) {
    this.selectedClaimType.set(id);
  }

  deleteAttachment(id: number) {
    this.attachments.update(current => current.filter(a => a.id !== id));
  }

  triggerFileInput(input: HTMLInputElement) {
    input.click();
  }

  // จัดการเมื่อมีการเลือกไฟล์แนบ
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

  // ตรวจสอบข้อมูลและบันทึกคำขอค่ารักษาพยาบาล
  save() {
    if (!this.selectedClaimType()) {
      this.alertService.showWarning('กรุณาเลือกประเภทการเบิกก่อนดำเนินการต่อ', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    if (!this.startDate() || !this.endDate()) {
      this.alertService.showWarning('กรุณาระบุวันที่รักษา', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    if (!this.dateUtil.isValidDateRange(this.startDate(), this.endDate())) {
      this.alertService.showWarning('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    if (!this.hospital() || !this.disease() || this.amount() <= 0) {
      this.alertService.showWarning('กรุณากรอกข้อมูลให้ครบถ้วน และจำนวนเงินที่เบิกต้องมากกว่า 0', 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    const typeLabel = this.claimTypes.find(t => t.id === this.selectedClaimType())?.label || '';

    const request: MedicalRequest = {
      id: this.requestId,
      createDate: dayjs().toISOString(),
      status: this.isEditMode() ? 'ตรวจสอบแล้ว' : 'คำขอใหม่',
      employeeId: 'EMP001',
      totalRequestedAmount: this.amount(),
      totalApprovedAmount: 0,
      items: [{
        requestDate: this.dateUtil.formatDateToBE(this.dateUtil.getCurrentDateISO()),
        limitType: typeLabel,
        diseaseType: this.disease(),
        hospital: this.hospital(),
        treatmentDateFrom: this.dateUtil.formatDateToBE(this.startDate()),
        treatmentDateTo: this.dateUtil.formatDateToBE(this.endDate()),
        requestedAmount: this.amount(),
        approvedAmount: 0
      }]
    };

    if (this.isEditMode()) {
      this.medicalService.updateRequest(request).subscribe({
        next: () => {
          this.alertService.showSuccess('แก้ไขข้อมูลเรียบร้อยแล้ว');
          this.close();
        },
        error: () => this.alertService.showError('เกิดข้อผิดพลาดในการแก้ไขข้อมูล')
      });
    } else {
      this.medicalService.addRequest(request).subscribe({
        next: () => {
          this.alertService.showSuccess('บันทึกข้อมูลเรียบร้อยแล้ว');
          this.close();
        },
        error: () => this.alertService.showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      });
    }
  }
}


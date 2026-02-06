import { Component, Input, Output, EventEmitter, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalexpensesService } from '../../../services/medicalexpenses.service';
import { UserService } from '../../../services/user.service';
import { MedicalRequest, MedicalItem } from '../../../interfaces/medical.interface';
import { ToastService } from '../../../services/toast';
import { DateUtilityService } from '../../../services/date-utility.service';
import { FilePreviewModalComponent, FilePreviewItem } from '../../modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';

import { MasterDataService, ClaimType } from '../../../services/master-data.service';

@Component({
  selector: 'app-medicalexpenses-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
  templateUrl: './medicalexpenses-form.html',
  styleUrl: './medicalexpenses-form.scss',
})
export class MedicalexpensesForm implements OnInit {
  private medicalService = inject(MedicalexpensesService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);
  private masterDataService = inject(MasterDataService);

  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  employeeId = signal<string>('');
  isEditMode = signal<boolean>(false);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  claimTypes: ClaimType[] = [];

  selectedClaimType = signal<string>('');

  hospital = signal<string>('');
  disease = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  amount = signal<number>(0);
  totalDays = computed(() => {
    if (!this.startDate() || !this.endDate()) return 0;
    const start = dayjs(this.startDate());
    const end = dayjs(this.endDate());
    const diff = end.diff(start, 'day') + 1;
    return diff > 0 ? diff : 0;
  });

  attachments = signal<{ id: number; name: string; description: string }[]>([
    { id: 1, name: 'approval-list-page.005-87d92c90a8cb2e588a7032052d9d94ac.png', description: 'ใบเสร็จยา' },
    { id: 2, name: 'original-aa87c620661b3eb94e5d85441b761387.png', description: 'ใบรับรองแพทย์' }
  ]);

  calculatedDays = computed(() => {
    if (!this.startDate() || !this.endDate()) return 0;
    const start = dayjs(this.startDate());
    const end = dayjs(this.endDate());
    if (end.isBefore(start)) return 0;
    return end.diff(start, 'day') + 1;
  });

  ngOnInit() {
    this.userService.getUserProfile().subscribe(profile => {
      this.employeeId.set(profile.employeeId);
    });

    this.masterDataService.getMedicalClaimTypes().subscribe(types => {
      this.claimTypes = types;
      this.loadRequestData();
    });
  }

  loadRequestData() {
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const currentAttachments = this.attachments();
      const newAttachments = Array.from(input.files).map((file: File, index) => ({
        id: currentAttachments.length + index + 1,
        name: file.name,
        description: ''
      }));
      this.attachments.update(current => [...current, ...newAttachments]);
    }
    input.value = '';
  }

  close() {
    this.onClose.emit();
  }

  openPreview(file: { name: string }) {
    this.previewFiles.set([{
      fileName: file.name,
      date: this.currentDate()
    }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  save() {
    if (!this.selectedClaimType()) {
      this.toastService.warning('กรุณาเลือกประเภทการเบิกก่อนดำเนินการต่อ');
      return;
    }

    if (!this.startDate() || !this.endDate()) {
      this.toastService.warning('กรุณาระบุวันที่รักษา');
      return;
    }

    if (!this.dateUtil.isValidDateRange(this.startDate(), this.endDate())) {
      this.toastService.warning('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    if (!this.hospital() || !this.disease() || this.amount() <= 0) {
      this.toastService.warning('กรุณากรอกข้อมูลให้ครบถ้วน และจำนวนเงินที่เบิกต้องมากกว่า 0');
      return;
    }

    const typeLabel = this.claimTypes.find(t => t.id === this.selectedClaimType())?.label || '';

    this.userService.getUserProfile().subscribe(profile => {
      const titleName = profile.name.split(' ')[0];
      const request: MedicalRequest = {
        id: this.requestId,
        createDate: dayjs().toISOString(),
        status: this.isEditMode() ? 'VERIFIED' : 'NEW',
        employeeId: profile.employeeId,
        requester: {
          employeeId: profile.employeeId,
          name: profile.name,
          department: profile.department,
          company: profile.company
        },
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
            this.toastService.success('แก้ไขข้อมูลเรียบร้อยแล้ว');
            this.close();
          },
          error: () => this.toastService.error('เกิดข้อผิดพลาดในการแก้ไขข้อมูล')
        });
      } else {
        this.medicalService.addRequest(request).subscribe({
          next: () => {
            this.toastService.success('บันทึกข้อมูลเรียบร้อยแล้ว');
            this.close();
          },
          error: () => this.toastService.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
        });
      }
    });
  }
}

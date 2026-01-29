import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../../services/vehicle.service';
import { AllowanceService } from '../../../services/allowance.service';
import { TaxiService } from '../../../services/taxi.service';
import { TransportService } from '../../../services/transport.service';
import { MedicalexpensesService } from '../../../services/medicalexpenses.service';
import { AlertService } from '../../../services/alert.service';
import { FilePreviewModalComponent } from '../file-preview-modal/file-preview-modal';

export interface UnifiedItem {
  date: string;
  description?: string;
  timeIn?: string;
  timeOut?: string;
  amount: number;
  destination?: string;
  shiftCode?: string;
  attachedFile?: string;
}

export interface ApprovalItem {
  requestNo: string;
  requestDate: string;
  requestBy: {
    name: string;
    employeeId: string;
    department: string;
    company: string;
  };
  requestType: 'ค่าเบี้ยเลี้ยง' | 'ค่ารถ' | 'ค่าแท็กซี่' | 'ค่ารักษาพยาบาล';
  typeId: number;
  requestDetail: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Referred Back';
}

@Component({
  selector: 'app-approval-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
  templateUrl: './approval-detail-modal.html',
  styleUrl: './approval-detail-modal.scss'
})
export class ApprovalDetailModalComponent implements OnInit {
  private vehicleService = inject(VehicleService);
  private allowanceService = inject(AllowanceService);
  private taxiService = inject(TaxiService);
  private transportService = inject(TransportService);
  private medicalService = inject(MedicalexpensesService);
  private alertService = inject(AlertService);

  @Input({ required: true }) approvalItem!: ApprovalItem;
  @Input() initialAction: 'Approved' | 'Rejected' | 'Referred Back' | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onStatusUpdated = new EventEmitter<void>();

  protected readonly Math = Math;

  modalActiveTab = signal<'Items' | 'Comments'>('Items');
  isActionConfirm = signal<boolean>(false);
  actionType = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  reasonText = signal<string>('');

  currentDetailItems = signal<UnifiedItem[]>([]);
  currentDetailType = signal<'allowance' | 'taxi' | 'vehicle' | 'medical' | null>(null);
  detailedStatus = signal<string>('');
  steps = [
    { label: 'พนักงานยืนยัน', id: 1, icon: 'fas fa-user-check' },
    { label: 'ต้นสังกัดอนุมัติ', id: 2, icon: 'fas fa-sitemap' },
    { label: 'ฝ่ายบุคคลอนุมัติ', id: 3, icon: 'fas fa-users-cog' },
    { label: 'ผู้บริหารอนุมัติ', id: 4, icon: 'fas fa-user-tie' },
    { label: 'ฝ่ายบัญชีอนุมัติ', id: 5, icon: 'fas fa-file-invoice-dollar' }
  ];

  // คำนวณลำดับขั้นตอนการอนุมัติ (1-5) จากสถานะภาษาไทย
  currentStepIndex = computed(() => {
    const status = this.detailedStatus();
    if (!status) return 0;

    if (status === 'รอพนักงานยืนยัน') return 1;
    if (status === 'รอต้นสังกัดอนุมัติ') return 2;
    if (status === 'รอฝ่ายบุคคลอนุมัติ') return 3;
    if (status === 'รอผู้บริหารอนุมัติ') return 4;
    if (status === 'รอฝ่ายบัญชีอนุมัติ') return 5;
    if (status === 'อนุมัติแล้ว') return 6;
    if (status === 'ไม่อนุมัติ') return -1;
    if (status === 'รอแก้ไข') return -1;
    return 1;
  });

  // แปลงสถานะรายละเอียดเป็นสถานะหลัก (Pending, Approved, Rejected, Referred Back)
  getDisplayStatus(): string {
    const status = this.detailedStatus() || this.approvalItem.status;
    const s = status?.trim();

    if (s === 'ไม่อนุมัติ') return 'Rejected';
    if (s === 'รอแก้ไข') return 'Referred Back';
    if (s === 'อนุมัติแล้ว') return 'Approved';
    if (s === 'รอพนักงานยืนยัน' ||
      s === 'รอต้นสังกัดอนุมัติ' ||
      s === 'รอฝ่ายบุคคลอนุมัติ' ||
      s === 'รอผู้บริหารอนุมัติ' ||
      s === 'รอฝ่ายบัญชีอนุมัติ' ||
      s.includes('รอตรวจสอบ')) {
      return 'Pending';
    }
    if (s.includes('จ่าย')) return 'Approved';

    return 'Pending';
  }

  isPreviewModalOpen = signal(false);
  previewFiles = signal<any[]>([]);

  selectedRequestDetails = computed(() => {
    return {
      type: this.currentDetailType(),
      items: this.currentDetailItems()
    };
  });

  modalItemsTotal = computed(() => {
    return this.currentDetailItems().reduce((sum, item) => sum + item.amount, 0);
  });

  // เริ่มต้น: โหลดรายละเอียดคำขอและตรวจสอบค่าเริ่มต้น
  ngOnInit() {
    this.loadDetails();
    if (this.initialAction) {
      this.isActionConfirm.set(true);
      this.actionType.set(this.initialAction);
    }
  }

  // โหลดรายละเอียดรายการเบิกตามประเภท (เบี้ยเลี้ยง, แท็กซี่, หรือรถส่วนตัว)
  loadDetails() {
    const item = this.approvalItem;
    if (!item) return;

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') {
      this.currentDetailType.set('allowance');
      this.allowanceService.getAllowanceRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
          this.detailedStatus.set(data.status);
        }
      });
    } else if (item.requestType === 'ค่าแท็กซี่') {
      this.currentDetailType.set('taxi');
      this.taxiService.getTaxiRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
          this.detailedStatus.set(data.status);
        }
      });
    } else if (item.requestType === 'ค่ารักษาพยาบาล') {
      this.currentDetailType.set('medical');
      this.medicalService.getRequestById(item.requestNo).subscribe(data => {
        if (data) {
          // Map medical items to UnifiedItem
          const unifiedItems: UnifiedItem[] = (data.items || []).map(m => ({
            date: m.treatmentDateFrom || data.createDate,
            description: `${m.diseaseType} (${m.hospital})` || '',
            amount: m.requestedAmount || 0,
            attachedFile: '' // If there are files, map them here
          }));
          this.currentDetailItems.set(unifiedItems);
          this.detailedStatus.set(data.status);
        }
      });
    } else {
      this.currentDetailType.set('vehicle');
      this.transportService.getRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
          this.detailedStatus.set(data.status);
        }
      });
    }
  }

  // เปิดส่วนยืนยันการดำเนินการ (อนุมัติ/ไม่อนุมัติ/ส่งคืน)
  openActionConfirm(action: 'Approved' | 'Rejected' | 'Referred Back') {
    this.isActionConfirm.set(true);
    this.actionType.set(action);
    this.reasonText.set('');
  }


  closeActionConfirm() {
    this.isActionConfirm.set(false);
    this.actionType.set(null);
    this.reasonText.set('');
  }


  // ยืนยันการดำเนินการและตรวจสอบความถูกต้องของข้อมูล
  confirmAction() {
    const item = this.approvalItem;
    const action = this.actionType();
    const reason = this.reasonText();

    if (!item || !action) return;

    if ((action === 'Rejected' || action === 'Referred Back') && !reason.trim()) {
      this.alertService.showWarning('กรุณาระบุเหตุผลการปฏิเสธหรือส่งแก้ไขเพื่อความชัดเจน', 'กรุณาระบุเหตุผล');
      return;
    }

    this.updateStatus(item, action, reason);
  }

  // อัปเดตสถานะคำขอตามขั้นตอนการอนุมัติและแจ้งเตือนผลลัพธ์
  private updateStatus(item: ApprovalItem, newStatus: any, reason?: string) {
    let type: 'allowance' | 'taxi' | 'vehicle' | 'medical' = 'vehicle';
    let statusLabel = 'รอพนักงานยืนยัน';

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') type = 'allowance';
    else if (item.requestType === 'ค่าแท็กซี่') type = 'taxi';
    else if (item.requestType === 'ค่ารักษาพยาบาล') type = 'medical';

    if (newStatus === 'Rejected') {
      statusLabel = 'ไม่อนุมัติ';
    } else if (newStatus === 'Referred Back') {
      statusLabel = 'รอแก้ไข';
    } else if (newStatus === 'Approved') {
      const currentStatus = this.detailedStatus();
      const currentStep = this.currentStepIndex();

      if (currentStatus === 'รอพนักงานยืนยัน' || currentStep === 1) {
        statusLabel = 'รอต้นสังกัดอนุมัติ';
      } else if (currentStatus === 'รอต้นสังกัดอนุมัติ' || currentStep === 2) {
        statusLabel = 'รอฝ่ายบุคคลอนุมัติ';
      } else if (currentStatus === 'รอฝ่ายบุคคลอนุมัติ' || currentStep === 3) {
        statusLabel = 'รอผู้บริหารอนุมัติ';
      } else if (currentStatus === 'รอผู้บริหารอนุมัติ' || currentStep === 4) {
        statusLabel = 'รอฝ่ายบัญชีอนุมัติ';
      } else if (currentStatus === 'รอฝ่ายบัญชีอนุมัติ' || currentStep === 5) {
        statusLabel = 'อนุมัติแล้ว';
      } else {
        statusLabel = 'อนุมัติแล้ว';
      }
    }

    if (type === 'allowance') {
      this.allowanceService.updateAllowanceStatus(item.requestNo, statusLabel);
    } else if (type === 'taxi') {
      this.taxiService.updateTaxiStatus(item.requestNo, statusLabel);
    } else if (type === 'medical') {
      // Assuming updateRequest takes the whole object, but here we only have status. 
      // We might need to fetch, update, then save, or if service supports updateStatus.
      // Looking at service, it has updateRequest(MedicalRequest). 
      // So I should fetch first or create a partial update. 
      // For now, I'll fetch briefly or assume I have it. 
      // Actually I have loaded it in loadDetails but I didn't store the full object.
      // Let's just call a new method if it exists, or update via getRequestById -> update.
      this.medicalService.getRequestById(item.requestNo).subscribe(req => {
        if (req) {
          req.status = statusLabel;
          this.medicalService.updateRequest(req).subscribe();
        }
      });
    } else {
      this.transportService.updateStatus(item.requestNo, statusLabel);
    }

    this.onStatusUpdated.emit();
    this.onClose.emit();

    const successMsg = newStatus === 'Approved' ? 'ดำเนินการอนุมัติเรียบร้อยแล้ว' : 'ดำเนินการส่งคืน/ปฏิเสธเรียบร้อยแล้ว';
    this.alertService.showSuccess(successMsg, 'ดำเนินการสำเร็จ');
  }

  close() {
    this.onClose.emit();
  }

  // เปิดดูไฟล์แนบ
  openPreview(fileName: string) {
    if (!fileName) return;
    this.previewFiles.set([{ fileName, date: '' }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}


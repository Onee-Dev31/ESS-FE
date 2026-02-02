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
import { StatusLabelPipe } from '../../../pipes/status-label.pipe';

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
  status: 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ' | 'รอแก้ไข';
  rawStatus: string;
}

@Component({
  selector: 'app-approval-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, StatusLabelPipe],
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

  // คำนวณลำดับขั้นตอนการอนุมัติ (1-5) จากสถานะภาษาไทย (Mapping from English codes)
  currentStepIndex = computed(() => {
    // Note: This relies on the 'status' field being the English code from the object
    // However, detailedStatus might be populated from service which should now return English codes.
    // If detailedStatus is still Thai (from legacy mock), we might need to handle both OR ensure service returns English.
    // Assuming service mocks now return English codes like 'WAITING_CHECK', 'PENDING_APPROVAL', etc.

    // We'll trust detailedStatus returns English code if it comes from service, or fallback to approvalItem.rawStatus
    const status = this.detailedStatus() || this.approvalItem.rawStatus;

    if (!status) return 0;

    // Map English codes to steps
    if (status === 'WAITING_CHECK' || status === 'NEW') return 1; // Wait for employee confirm/check
    if (status === 'PENDING_APPROVAL') return 4; // Mock logic: Pending Approval -> Executive (Step 4) or adjusted based on flow
    if (status === 'APPROVED') return 6;
    if (status === 'REJECTED') return -1;
    if (status === 'REFERRED_BACK') return -1;

    // Legacy Fallback (if any) or specific step mapping needs to be more granular if we have multiple pending states
    // For now, mapping 'WAITING_CHECK' to step 1 (Employee/Check) and 'PENDING_APPROVAL' to step 3/4

    if (status === 'VERIFIED') return 2; // Verified -> Root/HR

    return 1;
  });

  // แปลงสถานะรายละเอียดเป็นสถานะหลัก (รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ, รอแก้ไข)
  getDisplayStatus(): string {
    const status = this.detailedStatus() || this.approvalItem.rawStatus; // Use rawStatus (English Code)
    const s = status?.trim();

    if (s === 'REJECTED' || s === 'ไม่อนุมัติ') return 'ไม่อนุมัติ';
    if (s === 'REFERRED_BACK' || s === 'รอแก้ไข') return 'รอแก้ไข';
    if (s === 'APPROVED' || s === 'อนุมัติแล้ว' || s.includes('จ่าย')) return 'อนุมัติแล้ว';

    // All known pending codes
    if (s === 'NEW' || s === 'WAITING_CHECK' || s === 'VERIFIED' || s === 'PENDING_APPROVAL' || s === 'PENDING_ACTION') {
      return 'รออนุมัติ';
    }

    // Fallback for Thai strings if mixed data
    if (s === 'รอพนักงานยืนยัน' ||
      s === 'รอต้นสังกัดอนุมัติ' ||
      s === 'รอฝ่ายบุคคลอนุมัติ' ||
      s === 'รอผู้บริหารอนุมัติ' ||
      s === 'รอฝ่ายบัญชีอนุมัติ' ||
      s.includes('รอตรวจสอบ')) {
      return 'รออนุมัติ';
    }

    return 'รออนุมัติ';
  }

  // Map Thai status to CSS class
  getStatusClass(status: string): string {
    switch (status) {
      case 'อนุมัติแล้ว': return 'approved';
      case 'ไม่อนุมัติ': return 'rejected';
      case 'รอแก้ไข': return 'referred-back';
      case 'รออนุมัติ': return 'pending';
      default: return 'pending';
    }
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
            attachedFile: m.attachedFile || '' // Map file attachment from medical data
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

    // Use proper English status code for saving
    let statusCode = 'WAITING_CHECK';

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') type = 'allowance';
    else if (item.requestType === 'ค่าแท็กซี่') type = 'taxi';
    else if (item.requestType === 'ค่ารักษาพยาบาล') type = 'medical';

    if (newStatus === 'Rejected') {
      statusCode = 'REJECTED';
    } else if (newStatus === 'Referred Back') {
      statusCode = 'REFERRED_BACK';
    } else if (newStatus === 'Approved') {
      // Logic for approval progression (Mocked)
      // For simplified demo: Check current status and move to APPROVED or next step
      const currentStatus = this.detailedStatus() || item.rawStatus;

      if (currentStatus === 'NEW' || currentStatus === 'WAITING_CHECK') {
        statusCode = 'VERIFIED'; // Or PENDING_APPROVAL
      } else if (currentStatus === 'VERIFIED') {
        statusCode = 'APPROVED';
      } else {
        statusCode = 'APPROVED';
      }

      // Force approve for demo if needed, or stick to flow.
      // User asked to "fix status to match", implying simple Approve -> Approved might be desired for quick test?
      // Let's assume standard flow: Approve -> Approved for simplicity unless stepped.
      statusCode = 'APPROVED';
    }

    if (type === 'allowance') {
      this.allowanceService.updateAllowanceStatus(item.requestNo, statusCode);
    } else if (type === 'taxi') {
      this.taxiService.updateTaxiStatus(item.requestNo, statusCode);
    } else if (type === 'medical') {
      this.medicalService.getRequestById(item.requestNo).subscribe(req => {
        if (req) {
          req.status = statusCode;
          this.medicalService.updateRequest(req).subscribe();
        }
      });
    } else {
      this.transportService.updateStatus(item.requestNo, statusCode);
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


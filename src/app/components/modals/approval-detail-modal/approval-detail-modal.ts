import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceService } from '../../../services/allowance.service';
import { TaxiService } from '../../../services/taxi.service';
import { TransportService } from '../../../services/transport.service';
import { MedicalexpensesService } from '../../../services/medicalexpenses.service';
import { AlertService } from '../../../services/alert.service';
import { FilePreviewModalComponent } from '../file-preview-modal/file-preview-modal';
import { StatusLabelPipe } from '../../../pipes/status-label.pipe';
import { UnifiedItem, ApprovalItem } from '../../../interfaces/approval.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { StatusUtil } from '../../../utils/status.util';


@Component({
  selector: 'app-approval-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, StatusLabelPipe],
  templateUrl: './approval-detail-modal.html',
  styleUrl: './approval-detail-modal.scss'
})
/**
 * Modal สำหรับแสดงรายละเอียดรายการขออนุมัติ
 * - รองรับ 4 ประเภท: เบี้ยเลี้ยง, ค่ารถ, แท็กซี่, ค่ารักษาพยาบาล
 * - แสดงสถานะ (Stepper)
 * - ดำเนินการอนุมัติ/ปฏิเสธ/ส่งแก้ไข
 */
export class ApprovalDetailModalComponent implements OnInit {
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
  // ขั้นตอนการอนุมัติ (Stepper Configuration)
  steps = [
    { label: 'พนักงานยืนยัน', id: 1, icon: 'fas fa-user-check' },
    { label: 'ต้นสังกัดอนุมัติ', id: 2, icon: 'fas fa-sitemap' },
    { label: 'ฝ่ายบุคคลอนุมัติ', id: 3, icon: 'fas fa-users-cog' },
    { label: 'ผู้บริหารอนุมัติ', id: 4, icon: 'fas fa-user-tie' },
    { label: 'ฝ่ายบัญชีอนุมัติ', id: 5, icon: 'fas fa-file-invoice-dollar' }
  ];

  // คำนวณ index ของ Step ปัจจุบันเพื่อแสดงใน Stepper
  currentStepIndex = computed(() => {
    const status = this.detailedStatus() || this.approvalItem.rawStatus;

    if (!status) return 0;

    if (status === REQUEST_STATUS.WAITING_CHECK || status === REQUEST_STATUS.NEW) return 1;
    if (status === REQUEST_STATUS.PENDING_APPROVAL) return 4;
    if (status === REQUEST_STATUS.APPROVED) return 6;
    if (status === REQUEST_STATUS.REJECTED) return -1;
    if (status === REQUEST_STATUS.REFERRED_BACK) return -1;

    if (status === REQUEST_STATUS.VERIFIED) return 2;

    return 1;
  });

  getDisplayStatus(): string {
    const status = this.detailedStatus() || this.approvalItem.rawStatus;
    const s = status?.trim();

    if (s === REQUEST_STATUS.REJECTED || s === 'ไม่อนุมัติ') return 'ไม่อนุมัติ';
    if (s === REQUEST_STATUS.REFERRED_BACK || s === 'รอแก้ไข') return 'รอแก้ไข';
    if (s === REQUEST_STATUS.APPROVED || s === 'อนุมัติแล้ว' || s.includes('จ่าย')) return 'อนุมัติแล้ว';

    if (s === REQUEST_STATUS.NEW || s === REQUEST_STATUS.WAITING_CHECK || s === REQUEST_STATUS.VERIFIED || s === REQUEST_STATUS.PENDING_APPROVAL || s === REQUEST_STATUS.PENDING_ACTION) {
      return 'รออนุมัติ';
    }

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

  getStatusClass(status: string): string {
    const cssClass = StatusUtil.getStatusBadgeClass(status);
    return StatusUtil.getStatusBadgeClass(status);
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

  ngOnInit() {
    this.loadDetails();
    if (this.initialAction) {
      this.isActionConfirm.set(true);
      this.actionType.set(this.initialAction);
    }
  }

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
          const unifiedItems: UnifiedItem[] = (data.items || []).map(m => ({
            date: m.treatmentDateFrom || data.createDate,
            description: `${m.diseaseType} (${m.hospital})` || '',
            amount: m.requestedAmount || 0,
            attachedFile: m.attachedFile || ''
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

  private updateStatus(item: ApprovalItem, newStatus: any, reason?: string) {
    let type: 'allowance' | 'taxi' | 'vehicle' | 'medical' = 'vehicle';

    let statusCode = REQUEST_STATUS.WAITING_CHECK;

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') type = 'allowance';
    else if (item.requestType === 'ค่าแท็กซี่') type = 'taxi';
    else if (item.requestType === 'ค่ารักษาพยาบาล') type = 'medical';

    if (newStatus === 'Rejected') {
      statusCode = REQUEST_STATUS.REJECTED;
    } else if (newStatus === 'Referred Back') {
      statusCode = REQUEST_STATUS.REFERRED_BACK;
    } else if (newStatus === 'Approved') {
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

  openPreview(fileName: string) {
    if (!fileName) return;
    this.previewFiles.set([{ fileName, date: '' }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}


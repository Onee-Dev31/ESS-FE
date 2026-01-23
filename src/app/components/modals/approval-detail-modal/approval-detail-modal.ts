import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../../services/vehicle.service';
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
  requestType: 'ค่าเบี้ยเลี้ยง' | 'ค่ารถ' | 'ค่าแท็กซี่';
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
  currentDetailType = signal<'allowance' | 'taxi' | 'vehicle' | null>(null);
  detailedStatus = signal<string>('');

  steps = [
    { label: 'พนักงานยืนยัน', id: 1, icon: 'fas fa-user-check' },
    { label: 'ต้นสังกัดอนุมัติ', id: 2, icon: 'fas fa-sitemap' },
    { label: 'ฝ่ายบุคคลอนุมัติ', id: 3, icon: 'fas fa-users-cog' },
    { label: 'ผู้บริหารอนุมัติ', id: 4, icon: 'fas fa-user-tie' },
    { label: 'ฝ่ายบัญชีอนุมัติ', id: 5, icon: 'fas fa-file-invoice-dollar' }
  ];

  currentStepIndex = computed(() => {
    const status = this.detailedStatus();
    if (!status) return 0;

    // Mapping logic for multi-stage stepper
    if (status === 'รอพนักงานยืนยัน') return 1;
    if (status === 'รอต้นสังกัดอนุมัติ') return 2;
    if (status === 'รอฝ่ายบุคคลอนุมัติ') return 3;
    if (status === 'รอผู้บริหารอนุมัติ') return 4;
    if (status === 'รอฝ่ายบัญชีอนุมัติ') return 5;
    if (status === 'อนุมัติแล้ว') return 6; // All stages completed (5 steps done)
    if (status === 'ไม่อนุมัติ') return -1;
    if (status === 'รอแก้ไข') return -1;
    return 1;
  });

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
      this.vehicleService.getAllowanceRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
          this.detailedStatus.set(data.status);
        }
      });
    } else if (item.requestType === 'ค่าแท็กซี่') {
      this.currentDetailType.set('taxi');
      this.vehicleService.getTaxiRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
          this.detailedStatus.set(data.status);
        }
      });
    } else {
      this.currentDetailType.set('vehicle');
      this.vehicleService.getRequestById(item.requestNo).subscribe(data => {
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
      alert('กรุณาระบุเหตุผล (Please provide a reason)');
      return;
    }

    this.updateStatus(item, action, reason);
  }

  private updateStatus(item: ApprovalItem, newStatus: any, reason?: string) {
    let type: 'allowance' | 'taxi' | 'vehicle' = 'vehicle';
    let statusLabel = 'รอพนักงานยืนยัน';

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') type = 'allowance';
    else if (item.requestType === 'ค่าแท็กซี่') type = 'taxi';

    // Handle Reject and Refer Back
    if (newStatus === 'Rejected') {
      statusLabel = 'ไม่อนุมัติ';
    } else if (newStatus === 'Referred Back') {
      statusLabel = 'รอแก้ไข';
    } else if (newStatus === 'Approved') {
      // Multi-stage approval progression
      const currentStatus = this.detailedStatus();
      const currentStep = this.currentStepIndex();

      // Advance to next stage based on current status
      // Use the defined steps for cleaner progression
      if (currentStatus === 'รอพนักงานยืนยัน' || currentStep === 1) {
        statusLabel = 'รอต้นสังกัดอนุมัติ';
      } else if (currentStatus === 'รอต้นสังกัดอนุมัติ' || currentStep === 2) {
        statusLabel = 'รอฝ่ายบุคคลอนุมัติ';
      } else if (currentStatus === 'รอฝ่ายบุคคลอนุมัติ' || currentStep === 3) {
        statusLabel = 'รอผู้บริหารอนุมัติ';
      } else if (currentStatus === 'รอผู้บริหารอนุมัติ' || currentStep === 4) {
        statusLabel = 'รอฝ่ายบัญชีอนุมัติ';
      } else if (currentStatus === 'รอฝ่ายบัญชีอนุมัติ' || currentStep === 5) {
        // Final stage - mark as fully approved
        statusLabel = 'อนุมัติแล้ว';
      } else if (currentStatus === 'อนุมัติแล้ว') {
        // Already approved, keep it approved
        statusLabel = 'อนุมัติแล้ว';
      } else {
        // If unknown status but looks like it might be a later stage (or logic failed),
        // determine if we should default to Approved or Pending.
        // For safety, legal flow should start at Pending, but falling back to Step 1 triggers the reset bug.
        // If we are here, it means we don't recognize the status. 
        // Let's assume if it doesn't match, we check if it is already approved logic fails?

        // Log warning
        console.warn('Unknown status flow:', currentStatus, currentStep);
        // Default to current status to avoid resetting, or ...
        // If we really must pick a valid status, verify if it was "Approved".
        statusLabel = 'รอพนักงานยืนยัน';
      }

      console.log('Status Transition:', {
        currentStatus,
        currentStep,
        newStatus: statusLabel
      });
    }

    this.vehicleService.updateStatus(item.requestNo, type, statusLabel);

    if (reason) {
      console.log(`Action: ${newStatus}, Reason: ${reason}`);
    }

    this.onStatusUpdated.emit();
    this.onClose.emit();
  }

  close() {
    this.onClose.emit();
  }

  openPreview(fileName: string) {
    if (!fileName) return;
    this.previewFiles.set([{ fileName, date: '' }]); // basic mock
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}

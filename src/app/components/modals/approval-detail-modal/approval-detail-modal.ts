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

  modalActiveTab = signal<'Items' | 'Comments'>('Items');
  isActionConfirm = signal<boolean>(false);
  actionType = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  reasonText = signal<string>('');

  currentDetailItems = signal<UnifiedItem[]>([]);
  currentDetailType = signal<'allowance' | 'taxi' | 'vehicle' | null>(null);

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
        if (data) this.currentDetailItems.set(data.items as UnifiedItem[]);
      });
    } else if (item.requestType === 'ค่าแท็กซี่') {
      this.currentDetailType.set('taxi');
      this.vehicleService.getTaxiRequestById(item.requestNo).subscribe(data => {
        if (data) this.currentDetailItems.set(data.items as UnifiedItem[]);
      });
    } else {
      this.currentDetailType.set('vehicle');
      this.vehicleService.getRequestById(item.requestNo).subscribe(data => {
        if (data) this.currentDetailItems.set(data.items as UnifiedItem[]);
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
    let statusLabel = 'รอตรวจสอบ';

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') type = 'allowance';
    else if (item.requestType === 'ค่าแท็กซี่') type = 'taxi';

    if (newStatus === 'Approved') statusLabel = 'อนุมัติ';
    else if (newStatus === 'Rejected') statusLabel = 'ไม่อนุมัติ';
    else if (newStatus === 'Referred Back') statusLabel = 'รอแก้ไข';

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

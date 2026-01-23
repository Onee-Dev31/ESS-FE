import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../../services/vehicle.service';
import { AllowanceService } from '../../../services/allowance.service';
import { TaxiService } from '../../../services/taxi.service';
import { TransportService } from '../../../services/transport.service';
import { AlertService } from '../../../services/alert.service'; // เพิ่ม AlertService
import { FilePreviewModalComponent } from '../file-preview-modal/file-preview-modal';

/**
 * อินเตอร์เฟสสำหรับรายการสิ่งของ/ค่าใช้จ่ายที่รวมกัน (Unified) สำหรับแสดงใน Modal
 */
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

/**
 * อินเตอร์เฟสสำหรับรายการที่รอการอนุมัติ
 */
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
  private allowanceService = inject(AllowanceService);
  private taxiService = inject(TaxiService);
  private transportService = inject(TransportService);
  private alertService = inject(AlertService); // ฉีด AlertService

  @Input({ required: true }) approvalItem!: ApprovalItem;
  @Input() initialAction: 'Approved' | 'Rejected' | 'Referred Back' | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onStatusUpdated = new EventEmitter<void>();

  protected readonly Math = Math;

  // สถานะ UI ใน Modal
  modalActiveTab = signal<'Items' | 'Comments'>('Items');
  isActionConfirm = signal<boolean>(false);
  actionType = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  reasonText = signal<string>('');

  // ข้อมูลรายละเอียดที่ดึงมา
  currentDetailItems = signal<UnifiedItem[]>([]);
  currentDetailType = signal<'allowance' | 'taxi' | 'vehicle' | null>(null);
  detailedStatus = signal<string>('');

  // ขั้นตอนการอนุมัติ (Stepper)
  steps = [
    { label: 'พนักงานยืนยัน', id: 1, icon: 'fas fa-user-check' },
    { label: 'ต้นสังกัดอนุมัติ', id: 2, icon: 'fas fa-sitemap' },
    { label: 'ฝ่ายบุคคลอนุมัติ', id: 3, icon: 'fas fa-users-cog' },
    { label: 'ผู้บริหารอนุมัติ', id: 4, icon: 'fas fa-user-tie' },
    { label: 'ฝ่ายบัญชีอนุมัติ', id: 5, icon: 'fas fa-file-invoice-dollar' }
  ];

  /**
   * คำนวณลำดับขั้นตอนปัจจุบันจากสถานะข้อความ
   */
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

  /**
   * แปลงสถานะเพื่อใช้แสดงผลใน Badge ของ Modal
   */
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

  /**
   * รวมประเภทและรายการเข้าด้วยกันเพื่อใช้งานใน Template
   */
  selectedRequestDetails = computed(() => {
    return {
      type: this.currentDetailType(),
      items: this.currentDetailItems()
    };
  });

  /**
   * คำนวณยอดรวมของรายการใน Modal
   */
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

  /**
   * โหลดข้อมูลรายละเอียดเชิงลึกตามประเภทของสวัสดิการ
   */
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

  /**
   * เปิดหน้าต่างยืนยันการตัดสินใจ (Approve/Reject/Refer Back)
   */
  openActionConfirm(action: 'Approved' | 'Rejected' | 'Referred Back') {
    this.isActionConfirm.set(true);
    this.actionType.set(action);
    this.reasonText.set('');
  }

  /**
   * ปิดหน้าต่างยืนยันการตัดสินใจ
   */
  closeActionConfirm() {
    this.isActionConfirm.set(false);
    this.actionType.set(null);
    this.reasonText.set('');
  }

  /**
   * ยืนยันการดำเนินการ
   */
  confirmAction() {
    const item = this.approvalItem;
    const action = this.actionType();
    const reason = this.reasonText();

    if (!item || !action) return;

    // ตรวจสอบว่าต้องใส่เหตุผลหรือไม่
    if ((action === 'Rejected' || action === 'Referred Back') && !reason.trim()) {
      this.alertService.showWarning('กรุณาระบุเหตุผลการปฏิเสธหรือส่งแก้ไขเพื่อความชัดเจน', 'กรุณาระบุเหตุผล');
      return;
    }

    this.updateStatus(item, action, reason);
  }

  /**
   * อัปเดตสถานะของคำขอใน Service ที่เกี่ยวข้อง
   */
  private updateStatus(item: ApprovalItem, newStatus: any, reason?: string) {
    let type: 'allowance' | 'taxi' | 'vehicle' = 'vehicle';
    let statusLabel = 'รอพนักงานยืนยัน';

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') type = 'allowance';
    else if (item.requestType === 'ค่าแท็กซี่') type = 'taxi';

    if (newStatus === 'Rejected') {
      statusLabel = 'ไม่อนุมัติ';
    } else if (newStatus === 'Referred Back') {
      statusLabel = 'รอแก้ไข';
    } else if (newStatus === 'Approved') {
      // ตรรกะการเลื่อนลำดับการอนุมัติ (Multi-stage progression)
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

    // เรียกอัปเดตสถานะตามประเภทของสวัสดิการ
    if (type === 'allowance') {
      this.allowanceService.updateAllowanceStatus(item.requestNo, statusLabel);
    } else if (type === 'taxi') {
      this.taxiService.updateTaxiStatus(item.requestNo, statusLabel);
    } else {
      this.transportService.updateStatus(item.requestNo, statusLabel);
    }

    this.onStatusUpdated.emit();
    this.onClose.emit();

    // แสดง Alert แจ้งผลการดำเนินการสำเร็จ
    const successMsg = newStatus === 'Approved' ? 'ดำเนินการอนุมัติเรียบร้อยแล้ว' : 'ดำเนินการส่งคืน/ปฏิเสธเรียบร้อยแล้ว';
    this.alertService.showSuccess(successMsg, 'ดำเนินการสำเร็จ');
  }

  /**
   * ปิด Modal
   */
  close() {
    this.onClose.emit();
  }

  /**
   * เปิดดูพรีวิวไฟล์แนบ
   */
  openPreview(fileName: string) {
    if (!fileName) return;
    this.previewFiles.set([{ fileName, date: '' }]);
    this.isPreviewModalOpen.set(true);
  }

  /**
   * ปิดหน้าต่างพรีวิวไฟล์
   */
  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}

import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleRequest } from '../../../services/transport.service';
import { AttendanceLog } from '../../../interfaces/transport.interface';
import { DateUtilityService } from '../../../services/date-utility.service';

interface VehicleLogItem extends AttendanceLog {
  amount: number;
  rateId: string;
  isDuplicate: boolean;
  type: string;
}

interface EditDetailItem {
  detailId: number;
  workDate: string;
  shiftCode: string;
  dayType: string;
  actualCheckin: string;
  actualCheckout: string;
  rateAmount: number;
  description: string;
  selected: boolean;
}

import { MasterDataService } from '../../../services/master-data.service';
import { VehicleService } from '../../../services/vehicle.service';
import { SwalService } from '../../../services/swal.service';
import dayjs from 'dayjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-form.html',
  styleUrls: ['./vehicle-form.scss']
})
export class VehicleFormComponent implements OnInit, OnChanges {
  @Input() requestId: string = '';
  @Input() claimId: number | null = null;
  @Input() claimData: any = null;

  @Output() onClose = new EventEmitter<void>();

  private vehicleService = inject(VehicleService);
  private authservice = inject(AuthService);
  dateUtil = inject(DateUtilityService);
  private swalService = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);
  private masterDataService = inject(MasterDataService);

  loadedRequest?: VehicleRequest;

  // Create mode
  thaiMonths: string[] = [];
  years: number[] = [];
  selectedMonthIndex: number = new Date().getMonth() + 1;
  selectedYearBE: number = new Date().getFullYear() + 543;
  logs: VehicleLogItem[] = [];

  // Edit mode
  isEditMode = false;
  isLoadingEdit = false;
  claimInfo: any = null;
  existingDetails: EditDetailItem[] = [];

  // Shared
  totalAmount: number = 0;

  get keptCount() { return this.existingDetails.filter(d => d.selected).length; }
  get removedCount() { return this.existingDetails.filter(d => !d.selected).length; }

  ngOnInit(): void {
    this.isEditMode = this.claimId != null;
    this.masterDataService.getDateConfig().subscribe(config => {
      this.thaiMonths = config.months;
      this.years = config.years;
      if (this.isEditMode) {
        this.loadExistingClaim();
      } else {
        this.loadData();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['claimId'] && !changes['claimId'].firstChange) {
      this.isEditMode = this.claimId != null;
      if (this.isEditMode) {
        this.loadExistingClaim();
      }
    } else if (changes['requestId'] && !changes['requestId'].firstChange) {
      if (!this.isEditMode) {
        this.loadData();
      }
    }
  }

  // ─── Create mode ────────────────────────────────────────────

  loadData() {
    this.generateCalendar();
  }

  generateCalendar() {
    this.vehicleService.getVehicleByEmpcode(this.selectedYearBE.toString(), this.selectedMonthIndex.toString()).subscribe({
      next: (res) => {
        const rawData = res.data;
        this.logs = rawData.map((item: any) => ({
          date: item.work_date,
          dayType: item.day_type,
          timeIn: item.actual_checkin,
          timeOut: item.actual_checkout,
          selected: false,
          isDuplicate: false,
          description: '',
          shiftCode: item.shift_code,
          amount: item.rate_amount,
          rateId: item.rate_id,
          type: item.condition_type
        } as VehicleLogItem));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  onInputChange(log: VehicleLogItem) {
    if (log.description && log.description.trim() !== '') {
      log.selected = true;
    }
    this.updateDuplicateStatus();
  }

  onToggleCheck(log: VehicleLogItem) {
    if (log.selected) {
      const hasSelectedSameDate = this.logs.some(item =>
        item !== log &&
        item.selected &&
        dayjs(item.date).format('YYYY-MM-DD') === dayjs(log.date).format('YYYY-MM-DD')
      );
      if (hasSelectedSameDate) {
        log.selected = false;
        return;
      }
    } else {
      log.description = '';
    }
    this.updateDuplicateStatus();
  }

  onSubmit() {
    const selectedLogs = this.logs
      .filter(log => log.selected)
      .map(log => ({
        work_date: dayjs(log.date).format('YYYY-MM-DD'),
        shift_code: log.shiftCode,
        day_type: log.dayType,
        actual_checkin: log.timeIn,
        actual_checkout: log.timeOut,
        rate_id: log.rateId,
        rate_amount: log.amount,
        description: log.description,
      }));

    const payload = {
      employee_code: this.authservice.userData().CODEMPID,
      details: selectedLogs
    };

    this.swalService.confirm('ยืนยันการเบิก')
      .then(result => {
        if (!result.isConfirmed) return;
        this.swalService.loading("กำลังบันทึกข้อมูล...");

        this.vehicleService.updateVehicleByEmpcode(payload).subscribe({
          next: (res) => {
            if (!res?.success) {
              this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
              return;
            }
            this.swalService.success(res.message || "บันทึกสำเร็จ");
            this.closeModal();
          },
          error: (error) => {
            console.error("Vehicle claim Error:", error);
            this.swalService.warning("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
          }
        });
      });
  }

  updateDuplicateStatus() {
    this.logs.forEach(log => log.isDuplicate = false);
    const grouped: { [key: string]: VehicleLogItem[] } = {};
    this.logs.forEach(log => {
      const key = dayjs(log.date).format('YYYY-MM-DD');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    });
    Object.keys(grouped).forEach(date => {
      const logsInDate = grouped[date];
      const selectedLogs = logsInDate.filter(l => l.selected);
      if (selectedLogs.length >= 1 && logsInDate.length > 1) {
        logsInDate.forEach(log => { log.isDuplicate = !log.selected; });
      }
    });
  }

  // ─── Edit mode ───────────────────────────────────────────────

  loadExistingClaim() {
    if (!this.claimData) return;
    this.claimInfo = this.claimData;
    this.existingDetails = (this.claimData.details ?? []).map((d: any) => ({
      detailId: d.detailId ?? d.detail_id,
      workDate: d.workDate ?? d.work_date,
      shiftCode: d.shiftCode ?? d.shift_code,
      dayType: d.dayType ?? d.day_type,
      actualCheckin: d.actualCheckin ?? d.actual_checkin,
      actualCheckout: d.actualCheckout ?? d.actual_checkout,
      rateAmount: d.rateAmount ?? d.rate_amount,
      description: d.description ?? '',
      selected: true,
    } as EditDetailItem));
    this.updateTotal();
    this.isLoadingEdit = false;
    this.cdr.detectChanges();
  }

  onToggleEditDetail(_detail: EditDetailItem) {
    this.updateTotal();
  }

  onEditDescChange(_detail: EditDetailItem) {
    this.updateTotal();
  }

  updateTotal() {
    if (this.isEditMode) {
      this.totalAmount = this.existingDetails
        .filter(d => d.selected)
        .reduce((sum, d) => sum + (d.rateAmount ?? 0), 0);
    } else {
      this.totalAmount = this.logs
        .filter(log => log.selected)
        .reduce((sum, current) => sum + current.amount, 0);
    }
  }

  onSubmitEdit() {
    const keptDetails = this.existingDetails.filter(d => d.selected);

    if (keptDetails.length === 0) {
      this.swalService.warning("กรุณาเลือกรายการอย่างน้อย 1 รายการ");
      return;
    }

    const invalidDesc = keptDetails.some(d => !d.description?.trim());
    if (invalidDesc) {
      this.swalService.warning("กรุณากรอกรายละเอียดให้ครบทุกรายการที่เลือก");
      return;
    }

    const removedCount = this.existingDetails.filter(d => !d.selected).length;
    const confirmMsg = removedCount > 0
      ? `จะเก็บ ${keptDetails.length} รายการ และลบ ${removedCount} รายการถาวร`
      : `บันทึกการแก้ไข ${keptDetails.length} รายการ`;

    this.swalService.confirm(confirmMsg).then(result => {
      if (!result.isConfirmed) return;
      this.swalService.loading("กำลังบันทึก...");

      const payload = {
        claim_id: this.claimId!,
        details: keptDetails.map(d => ({
          detail_id: d.detailId,
          description: d.description
        }))
      };

      this.vehicleService.patchVehicleClaim(this.claimId!, payload).subscribe({
        next: (res) => {
          if (!res?.success) {
            this.swalService.warning("ไม่สามารถบันทึกได้");
            return;
          }
          this.swalService.success("บันทึกสำเร็จ");
          this.closeModal();
        },
        error: (error) => {
          console.error("Patch vehicle Error:", error);
          this.swalService.warning("เกิดข้อผิดพลาด", error?.error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
        }
      });
    });
  }

  // ─── Shared ──────────────────────────────────────────────────

  closeModal() {
    this.onClose.emit();
  }
}

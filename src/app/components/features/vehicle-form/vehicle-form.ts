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
  detail_id?: string;
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
  // @Input() requestId: string = '';
  @Input() requests: any = null;

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

  MODE_EDIT: boolean = false;

  ngOnInit(): void {
    this.masterDataService.getDateConfig().subscribe(config => {
      this.thaiMonths = config.months;
      this.years = config.years;

      if (!this.requests) {
        this.loadData();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requests'] && this.requests && this.requests !== '') {
      // console.log('requests เข้ามาแล้ว:', this.requests);
      this.MODE_EDIT = true;
      this.mapData();
      return;
    }
  }

  // ─── Create mode ────────────────────────────────────────────

  loadData() {
    this.generateCalendar();
  }

  mapData() {
    this.logs = this.requests.details.map((item: any) => {
      return {
        date: item.work_date,
        dayType: item.day_type,
        timeIn: item.actual_checkin,
        timeOut: item.actual_checkout,
        selected: true,
        isDuplicate: false,
        description: item.description,
        shiftCode: item.shift_code,
        amount: item.rate_amount,
        rateId: item.rate_id,
        type: item.condition_label,
        detail_id: item.detail_id
      } as VehicleLogItem;
    })
  }

  // hasInvalid(): boolean {
  //   const selectedLogs = this.logs.filter(log => log.selected);

  //   if (selectedLogs.length === 0) {
  //     return true;
  //   }
  //   return selectedLogs.some(log => !log.description || log.description.trim() === '');
  // }

  isKeep(): number {
    const selectedLogs = this.logs.filter(log => log.selected);
    return selectedLogs.length
  }

  isDelete(): number {
    const selectedLogs = this.logs.filter(log => !log.selected);
    return selectedLogs.length
  }

  totolClaims(): string {
    const selectedLogs = this.logs.filter(log => log.selected);
    const total = selectedLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
    return total.toLocaleString('en-US') + '.-';
  }

  hasDelete(): boolean {
    const selectedLogs = this.logs.filter(log => log.selected);
    if (selectedLogs.length === 0) {
      return true;
    }
    return false
  }

  hasInvalid(): boolean {
    return this.logs.some(log =>
      log.selected && (!log.description || log.description.trim() === '')
    );
  }

  generateCalendar() {
    // console.log(this.selectedYearBE.toString(), this.selectedMonthIndex.toString())

    this.vehicleService.getVehicleByEmpcode(this.selectedYearBE.toString(), this.selectedMonthIndex.toString()).subscribe(
      {
        next: (res) => {
          // console.log(res);
          const rawData = res.data

          this.logs = rawData.map((item: any) => {
            return {
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
              type: item.condition_label
            } as VehicleLogItem;
          })
          this.cdr.detectChanges()
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      }
    );
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
      log.description = this.MODE_EDIT ? log.description : ''
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
        ...(log.detail_id && { detail_id: log.detail_id })
      }));

    // DELETE
    if (this.MODE_EDIT && selectedLogs.length === 0) {
      this.swalService.confirm('ยืนยันการลบรายการเบิกทั้งหมด')
        .then(result => {
          if (!result.isConfirmed) return;
          this.swalService.loading("กำลังบันทึกข้อมูล...");

          this.vehicleService.deleteVehicleByEmpCode(this.requests.id, this.authservice.userData().CODEMPID)
            .subscribe({
              next: (res) => {
                // console.log(res)
                if (!res?.success) {
                  this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
                  return;
                }

                this.swalService.success(res.message || "ลบรายการเบิกสำเร็จ");
                this.closeModal();
              },

              error: (error) => {
                console.error("Delete Vehicle Claim Error:", error);

                this.swalService.warning(
                  "เกิดข้อผิดพลาด",
                  error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
                );
              }
            });

        });
      return;
    }

    // EDIT
    if (this.MODE_EDIT) {
      const payload = {
        claim_id: this.requests.claimId,
        details: selectedLogs
      }
      this.swalService.confirm('ยืนยันการแก้ไขการเบิก')
        .then(result => {
          if (!result.isConfirmed) return;
          this.swalService.loading("กำลังบันทึกข้อมูล...");

          this.vehicleService.updateVehicleByClaimId(this.requests.id, payload)
            .subscribe({
              next: (res) => {
                // console.log(res)
                if (!res?.success) {
                  this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
                  return;
                }

                this.swalService.success(res.message || "บันทึกการแก้ไขสำเร็จ");
                this.closeModal();
              },

              error: (error) => {
                console.error("Update Vehicle Claim Error:", error);

                this.swalService.warning(
                  "เกิดข้อผิดพลาด",
                  error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
                );
              }
            });

        });
      return;
    }

    // CREATE
    const payload = {
      employee_code: this.authservice.userData().CODEMPID,
      details: selectedLogs
    }
    this.swalService.confirm('ยืนยันการเบิก')
      .then(result => {
        if (!result.isConfirmed) return;
        this.swalService.loading("กำลังบันทึกข้อมูล...");

        this.vehicleService.createVehicleByEmpcode(payload)
          .subscribe({
            next: (res) => {
              // console.log(res)
              if (!res?.success) {
                this.swalService.warning("ไม่สามารถบันทึกข้อมูลได้");
                return;
              }

              this.swalService.success(res.message || "บันทึกสำเร็จ");
              this.closeModal();
            },

            error: (error) => {
              console.error("Vehicle claim Error:", error);

              this.swalService.warning(
                "เกิดข้อผิดพลาด",
                error?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้"
              );
              this.closeModal();
            },
          });
      });
  }

  // updateDuplicateStatus() {
  //   this.logs.forEach(log => log.isDuplicate = false);
  //   const grouped: { [key: string]: VehicleLogItem[] } = {};
  //   this.logs.forEach(log => {
  //     const key = dayjs(log.date).format('YYYY-MM-DD');
  //     if (!grouped[key]) grouped[key] = [];
  //     grouped[key].push(log);
  //   });
  //   Object.keys(grouped).forEach(date => {
  //     const logsInDate = grouped[date];
  //     const selectedLogs = logsInDate.filter(l => l.selected);
  //     if (selectedLogs.length >= 1 && logsInDate.length > 1) {
  //       logsInDate.forEach(log => { log.isDuplicate = !log.selected; });
  //     }
  //   });
  // }

  closeModal() {
    this.MODE_EDIT = false;
    this.requests = null;
    this.onClose.emit();
  }

  updateDuplicateStatus() {
    this.logs.forEach(log => log.isDuplicate = false);

    const grouped: { [key: string]: VehicleLogItem[] } = {};

    this.logs.forEach(log => {
      const key = dayjs(log.date).format('YYYY-MM-DD');

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(log);
    });

    Object.keys(grouped).forEach(date => {
      const logsInDate = grouped[date];
      const selectedLogs = logsInDate.filter(l => l.selected);

      // ✅ มีคนเลือกอย่างน้อย 1 และมีหลายรายการในวันเดียวกัน
      if (selectedLogs.length >= 1 && logsInDate.length > 1) {
        logsInDate.forEach(log => {
          log.isDuplicate = !log.selected; // ตัวที่ไม่เลือก = true
        });
      }
    });
  }

}

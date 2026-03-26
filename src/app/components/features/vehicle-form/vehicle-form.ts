import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService, RequestItem, VehicleRequest } from '../../../services/transport.service';
import { AttendanceLog } from '../../../interfaces/transport.interface';
import { ToastService } from '../../../services/toast';
import { WELFARE_TYPES } from '../../../constants/welfare-types.constant';
import { DateUtilityService } from '../../../services/date-utility.service';

interface VehicleLogItem extends AttendanceLog {
  amount: number;
  rateId: string;
  isDuplicate: boolean;
  type: string;
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

  @Output() onClose = new EventEmitter<void>();

  private transportService = inject(TransportService);
  private vehicleService = inject(VehicleService);
  private authservice = inject(AuthService);
  private toastService = inject(ToastService);
  dateUtil = inject(DateUtilityService);
  private swalService = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);
  private masterDataService = inject(MasterDataService);

  loadedRequest?: VehicleRequest;

  thaiMonths: string[] = [];
  years: number[] = [];

  selectedMonthIndex: number = new Date().getMonth() + 1;
  selectedYearBE: number = new Date().getFullYear() + 543;
  totalAmount: number = 0;
  logs: VehicleLogItem[] = [];

  ngOnInit(): void {
    this.masterDataService.getDateConfig().subscribe(config => {
      this.thaiMonths = config.months;
      this.years = config.years;
      this.loadData();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requestId'] && !changes['requestId'].firstChange) {
      this.loadData();
    }
  }

  loadData() {
    this.generateCalendar();
  }

  generateCalendar() {
    // const existingRequest = this.loadedRequest;

    console.log(this.selectedYearBE.toString(), this.selectedMonthIndex.toString())

    this.vehicleService.getVehicleByEmpcode(this.selectedYearBE.toString(), this.selectedMonthIndex.toString()).subscribe(
      {
        next: (res) => {
          console.log(res);
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
              type: item.condition_type
            } as VehicleLogItem;
          })
          this.cdr.detectChanges()
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      }
    )
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
      log.description = ''
    }

    this.updateDuplicateStatus();
  }

  updateTotal() {
    this.totalAmount = this.logs
      .filter(log => log.selected)
      .reduce((sum, current) => sum + current.amount, 0);
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
    }

    console.log(payload)

    this.swalService.confirm('ยืนยันการเบิก')
      .then(result => {
        if (!result.isConfirmed) return;
        this.swalService.loading("กำลังบันทึกข้อมูล...");

        this.vehicleService.updateVehicleByEmpcode(payload)
          .subscribe({
            next: (res) => {
              console.log(res)
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
            }
          });

      });
  }

  closeModal() {
    this.onClose.emit();
  }

  // updateDuplicateStatus() {
  //   // reset ก่อน
  //   this.logs.forEach(log => log.isDuplicate = false);

  //   const grouped: { [key: string]: VehicleLogItem[] } = {};

  //   // group ตามวันที่ (ทุกตัว ไม่ใช่เฉพาะ selected)
  //   this.logs.forEach(log => {
  //     const key = dayjs(log.date).format('YYYY-MM-DD');

  //     if (!grouped[key]) {
  //       grouped[key] = [];
  //     }

  //     grouped[key].push(log);
  //   });

  //   // loop แต่ละวัน
  //   Object.keys(grouped).forEach(date => {
  //     const logsInDate = grouped[date];

  //     const selectedLogs = logsInDate.filter(l => l.selected);

  //     // ถ้ามี selected มากกว่า 1
  //     if (selectedLogs.length >= 1 && logsInDate.length > 1) {
  //       logsInDate.forEach(log => {
  //         if (!log.selected) {
  //           log.isDuplicate = true; // block ตัวอื่น
  //         } else {
  //           log.isDuplicate = false; // ตัวที่เลือกไม่โดน
  //         }
  //       });
  //     }
  //   });

  //   setTimeout(() => {
  //     console.log(grouped, this.logs)

  //   }, 1000);
  // }

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

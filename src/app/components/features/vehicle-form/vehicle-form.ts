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
              description: '',
              shiftCode: item.shift_code,
              amount: item.rate_amount,
              rateId: item.rate_id
            } as VehicleLogItem;
          })
          this.cdr.detectChanges()
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      }
    )

    // this.transportService.getMockAttendanceLogs(this.selectedMonthIndex, this.selectedYearBE).subscribe(rawLogs => {
    //   console.log()
    //   // this.logs = rawLogs.map((item: AttendanceLog) => {
    //   //   const matchingItem = existingRequest?.items.find(reqItem => reqItem.date === item.date);

    //   //   return {
    //   //     ...item,
    //   //     timeIn: item.timeIn ? String(item.timeIn) : '',
    //   //     timeOut: item.timeOut ? String(item.timeOut) : '',
    //   //     amount: matchingItem ? matchingItem.amount : 0,
    //   //     selected: !!matchingItem,
    //   //     description: matchingItem ? matchingItem.description : item.description,
    //   //   } as VehicleLogItem;
    //   // });

    //   // this.updateTotal();
    //   this.cdr.markForCheck();
    // });
  }

  onInputChange(log: VehicleLogItem) {
    if (log.description && log.description.trim() !== '') {
      log.selected = true;
    }
  }

  onToggleCheck(log: VehicleLogItem) {
    if (log.selected) {
    } else {
      log.amount = 0;
      this.updateTotal();
    }
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

    // const invalidLogs = selectedLogs.filter(log => {
    //   const description = log.description ? String(log.description).trim() : '';
    //   return description === '';
    // });

    // if (invalidLogs.length > 0) {
    //   const invalidDates = invalidLogs.map(log => log.date).join(', ');
    //   this.toastService.warning(`กรุณากรอกรายละเอียดการเบิกให้ครบถ้วนสำหรับวันที่: ${invalidDates}`);
    //   return;
    // }

    // if (selectedLogs.length === 0 || this.totalAmount === 0) {
    //   this.toastService.warning('ไม่พบรายการที่เข้าเงื่อนไขการเบิกค่ารถ (ก่อน 06:00 หรือ หลัง 22:00)');
    //   return;
    // }

    // const requestItems: RequestItem[] = selectedLogs.map(log => ({
    //   date: log.date,
    //   description: log.description,
    //   amount: log.amount
    // }));

    // this.transportService.getRequestById(this.requestId).subscribe(existingRequest => {
    //   if (existingRequest) {
    //     const updatedRequest: VehicleRequest = {
    //       ...existingRequest,
    //       items: requestItems
    //     };
    //     this.transportService.updateVehicleRequest(this.requestId, updatedRequest).subscribe(() => {
    //       this.toastService.success(`บันทึกการแก้ไขข้อมูลเรียบร้อย`);
    //       this.closeModal();
    //     });
    //   } else {
    //     const newRequest: VehicleRequest = {
    //       id: this.requestId,
    //       typeId: WELFARE_TYPES.TRANSPORT,
    //       createDate: this.dateUtil.getCurrentDateISO(),
    //       status: 'รอตรวจสอบ',
    //       items: requestItems
    //     };
    //     this.transportService.addRequest(newRequest).subscribe(() => {
    //       this.toastService.success(`สร้างรายการเบิกเลขที่ ${this.requestId} สำเร็จ\nยอดรวมทั้งสิ้น: ${this.totalAmount} บาท`);
    //       this.closeModal();
    //     });
    //   }
    // });
  }

  closeModal() {
    this.onClose.emit();
  }
}

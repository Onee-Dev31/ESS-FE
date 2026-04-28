import { Injectable, inject } from '@angular/core';
import { AllowanceRequest } from '../interfaces/allowance.interface';
import { TaxiRequest } from './taxi.service';
import { VehicleRequest } from './transport.service';
import { MedicalRequest } from './medicalexpenses.service';
import { ApprovalItem } from '../interfaces/approval.interface';
import { REQUEST_STATUS } from '../constants/request-status.constant';
import { DateUtilityService } from './date-utility.service';
import { AllowanceService } from './allowance.service';
import { TaxiService } from './taxi.service';
import { TransportService } from './transport.service';
import { MedicalexpensesService } from './medicalexpenses.service';
import { BaseRequestService } from './base-request.service';
import { Observable, forkJoin, map, take } from 'rxjs';
import { APPROVAL_STATUS, APPROVAL_LABELS } from '../constants/approval.constants';

@Injectable({
  providedIn: 'root',
})
/** Service ตัวช่วยจัดการข้อมูลและ Mapping ข้อมูลสำหรับการอนุมัติ (Approvals) */
export class ApprovalsHelperService {
  private dateUtil = inject(DateUtilityService);
  private taxiService = inject(TaxiService);
  private transportService = inject(TransportService);
  private medicalService = inject(MedicalexpensesService);
  private allowanceService = inject(AllowanceService);

  processData(
    allowance: AllowanceRequest[],
    taxi: TaxiRequest[],
    vehicle: VehicleRequest[],
  ): ApprovalItem[] {
    const allowanceItems = allowance.map((item) => this.mapToApproval(item, 'allowance'));
    const taxiItems = taxi.map((item) => this.mapToApproval(item, 'taxi'));
    const vehicleItems = vehicle.map((item) => this.mapToApproval(item, 'transport'));

    return [...allowanceItems, ...taxiItems, ...vehicleItems];
  }

  /** Mapping ข้อมูลจาก Service ต่าง ๆ ให้อยู่ในรูปแบบ ApprovalItem แบบครอบจักรวาล */
  private mapToApproval(
    item: AllowanceRequest | TaxiRequest | VehicleRequest,
    type: 'allowance' | 'taxi' | 'transport',
  ): ApprovalItem {
    const typeLabels = {
      allowance: 'ค่าเบี้ยเลี้ยง',
      taxi: 'ค่าแท็กซี่',
      transport: 'ค่ารถ',
    };

    const defaultDetails = {
      allowance: 'ค่าเบี้ยเลี้ยงและที่พัก',
      taxi: 'เดินทางไปหาลูกค้า',
      transport: 'ค่าน้ำมันรถ',
    };

    const details = item.items.map((i) => i.description).join(', ') || defaultDetails[type];
    const totalAmount = item.items.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    const requestId = (item as any).id;
    return {
      requestId: requestId,
      requestNo: item.id,
      requestDate: this.dateUtil.formatDateToThaiMonth(item.createDate),
      requestBy: {
        name: item.requester?.name || 'Unknown',
        employeeId: item.requester?.employeeId || 'EM-XXX',
        department: item.requester?.department || '-',
        company: 'Onee',
        position: '-',
        profileImage: 'assets/images/user-placeholder.png',
      },
      requestType: typeLabels[type] as 'ค่าเบี้ยเลี้ยง' | 'ค่ารถ' | 'ค่าแท็กซี่',
      typeId: 99,
      requestDetail: details,
      amount: totalAmount,
      status: this.mapStatus(item.status),
      rawStatus: this.normalizeStatus(item.status),
      type: type,
      originalData: item,
    };
  }

  processMedicalData(medicals: MedicalRequest[]): ApprovalItem[] {
    return medicals.map((req) => this.mapMedicalToApproval(req));
  }

  public mapMedicalToApproval(req: MedicalRequest): ApprovalItem {
    const defaultUser = {
      name: 'พนักงานทดสอบ',
      employeeId: 'N/A',
      department: 'N/A',
      company: 'บริษัท OTD',
    };
    const requestId = (req as any).id;
    return {
      requestId: requestId,
      requestNo: req.id,
      requestDate: req.createDate,
      requestBy: req.requester || defaultUser,
      requestType: 'ค่ารักษาพยาบาล',
      typeId: 99,
      requestDetail: req.items.map((i) => i.diseaseType).join(', '),
      amount: req.totalRequestedAmount || 0,
      status: this.mapStatus(req.status),
      rawStatus: this.normalizeStatus(req.status),
      type: 'medical',
      originalData: req,
    };
  }

  mapStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    const s = this.normalizeStatus(status);

    if (s === APPROVAL_STATUS.REJECTED || s === APPROVAL_LABELS.TH.REJECTED) return 'Rejected';
    if (s === APPROVAL_STATUS.REFERRED_BACK || s === APPROVAL_LABELS.TH.REFERRED_BACK)
      return 'Referred Back';
    if (s === APPROVAL_STATUS.APPROVED || s === APPROVAL_LABELS.TH.APPROVED || s.includes('จ่าย'))
      return 'Approved';

    return 'Pending';
  }

  /** กำหนด Class สีตามสถานะ (CSS Class) */
  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'pending';
      case 'Approved':
        return 'approved';
      case 'Rejected':
        return 'rejected';
      case 'Referred Back':
        return 'referred-back';
      default:
        return 'pending';
    }
  }

  getServiceByType(type: string): BaseRequestService<any> {
    switch (type) {
      // case 'allowance':
      //   return this.allowanceService;
      case 'taxi':
        return this.taxiService;
      case 'transport':
      case 'vehicle':
        return this.transportService;
      case 'medical':
        return this.medicalService;
      default:
        throw new Error(`Unknown service type: ${type}`);
    }
  }

  /** ฟังก์ชันจัดเรียงข้อมูล (Sorting) สำหรับตารางรายการอนุมัติ */
  sortData(data: ApprovalItem[], sortId: string, desc: boolean): ApprovalItem[] {
    const direction = desc ? -1 : 1;
    return [...data].sort((itemA, itemB) => {
      switch (sortId) {
        case 'requestNo':
          return itemA.requestNo.localeCompare(itemB.requestNo) * direction;
        case 'requestDate':
          const dateA =
            itemA.requestDate.split(' ')[0].split('/').reverse().join('') || itemA.requestDate;
          const dateB =
            itemB.requestDate.split(' ')[0].split('/').reverse().join('') || itemB.requestDate;
          return dateA.localeCompare(dateB) * direction;
        case 'requestBy':
          return itemA.requestBy.name.localeCompare(itemB.requestBy.name) * direction;
        case 'requestType':
          return itemA.requestType.localeCompare(itemB.requestType) * direction;
        case 'requestDetail':
          return itemA.requestDetail.localeCompare(itemB.requestDetail) * direction;
        case 'amount':
          return (itemA.amount - itemB.amount) * direction;
        case 'status':
          return itemA.status.localeCompare(itemB.status) * direction;
        default:
          return 0;
      }
    });
  }

  private normalizeStatus(status: string): string {
    if (!status) return APPROVAL_STATUS.WAITING_CHECK;
    const s = status.trim();

    if (['Pending', 'Waiting Check', 'New'].includes(s)) return APPROVAL_STATUS.WAITING_CHECK;
    if (['Approved', 'Approve'].includes(s)) return APPROVAL_STATUS.APPROVED;
    if (['Rejected', 'Reject'].includes(s)) return APPROVAL_STATUS.REJECTED;
    if (['Referred Back', 'Refer Back'].includes(s)) return APPROVAL_STATUS.REFERRED_BACK;
    if (['Verified', 'Verify', 'Checked'].includes(s)) return APPROVAL_STATUS.VERIFIED;

    if (s === APPROVAL_LABELS.TH.WAITING_CHECK) return APPROVAL_STATUS.WAITING_CHECK;
    if (s === APPROVAL_LABELS.TH.APPROVED) return APPROVAL_STATUS.APPROVED;
    if (s === APPROVAL_LABELS.TH.REJECTED) return APPROVAL_STATUS.REJECTED;
    if (s === APPROVAL_LABELS.TH.REFERRED_BACK) return APPROVAL_STATUS.REFERRED_BACK;

    return s;
  }
}

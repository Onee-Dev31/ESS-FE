import { Injectable } from '@angular/core';
import { AllowanceRequest } from './allowance.service';
import { TaxiRequest } from './taxi.service';
import { VehicleRequest } from './transport.service';
import { ApprovalItem } from '../components/modals/approval-detail-modal/approval-detail-modal';

@Injectable({
    providedIn: 'root'
})
export class ApprovalsHelperService {

    constructor() { }

    // รวมและแปลงข้อมูลจากหลาย Service เป็นรูปแบบรายการอนุมัติ
    processData(allowances: AllowanceRequest[], taxis: TaxiRequest[], vehicles: VehicleRequest[]): ApprovalItem[] {
        const list1: ApprovalItem[] = allowances.map(req => this.mapToApproval(req, 'ค่าเบี้ยเลี้ยง', req.typeId, 'Allowance'));
        const list2: ApprovalItem[] = taxis.map(req => this.mapToApproval(req, 'ค่าแท็กซี่', req.typeId, 'Taxi'));
        const list3: ApprovalItem[] = vehicles.map(req => this.mapToApproval(req, 'ค่ารถ', req.typeId, 'Vehicle'));

        return [...list1, ...list2, ...list3];
    }

    private mapToApproval(req: any, type: 'ค่าเบี้ยเลี้ยง' | 'ค่าแท็กซี่' | 'ค่ารถ', typeId: number, detailSub?: string): ApprovalItem {
        const defaultUser = {
            name: 'พนักงานทดสอบ',
            employeeId: 'N/A',
            department: 'N/A',
            company: 'บริษัท OTD'
        };

        return {
            requestNo: req.id,
            requestDate: req.createDate,
            requestBy: req.requester || defaultUser,
            requestType: type,
            typeId: typeId,
            requestDetail: req.items[0]?.description || detailSub || '',
            amount: req.items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0),
            status: this.mapStatus(req.status)
        };
    }

    // แปลงสถานะภาษาไทยเป็นภาษาอังกฤษประเภทต่างๆ
    mapStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
        const s = status?.trim();

        if (s === 'ไม่อนุมัติ') return 'Rejected';
        if (s === 'รอแก้ไข') return 'Referred Back';

        if (s === 'อนุมัติแล้ว' || s.includes('จ่าย')) return 'Approved';

        if (s === 'คำขอใหม่' ||
            s === 'ตรวจสอบแล้ว' ||
            s === 'อยู่ระหว่างการอนุมัติ' ||
            s === 'รอพนักงานยืนยัน' ||
            s === 'รอต้นสังกัดอนุมัติ' ||
            s === 'รอฝ่ายบุคคลอนุมัติ' ||
            s === 'รอผู้บริหารอนุมัติ' ||
            s === 'รอฝ่ายบัญชีอนุมัติ' ||
            s.includes('รอตรวจสอบ')) {
            return 'Pending';
        }

        return 'Pending';
    }
}

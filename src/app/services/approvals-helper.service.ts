import { Injectable } from '@angular/core';
import { AllowanceRequest } from '../interfaces/allowance.interface';
import { TaxiRequest } from './taxi.service';
import { VehicleRequest } from './transport.service';
import { MedicalRequest } from './medicalexpenses.service';
import { ApprovalItem } from '../components/modals/approval-detail-modal/approval-detail-modal';

@Injectable({
    providedIn: 'root'
})
export class ApprovalsHelperService {

    constructor() { }

    // รวมและแปลงข้อมูลจากหลาย Service เป็นรูปแบบรายการอนุมัติ
    processData(allowances: AllowanceRequest[], taxis: TaxiRequest[], vehicles: VehicleRequest[]): ApprovalItem[] {
        const list1: ApprovalItem[] = allowances.map(request => this.mapToApproval(request, 'ค่าเบี้ยเลี้ยง', request.typeId, 'Allowance'));
        const list2: ApprovalItem[] = taxis.map(request => this.mapToApproval(request, 'ค่าแท็กซี่', request.typeId, 'Taxi'));
        const list3: ApprovalItem[] = vehicles.map(request => this.mapToApproval(request, 'ค่ารถ', request.typeId, 'Vehicle'));

        return [...list1, ...list2, ...list3];
    }

    processMedicalData(medicals: MedicalRequest[]): ApprovalItem[] {
        return medicals.map(req => this.mapMedicalToApproval(req));
    }

    private mapToApproval(request: any, type: 'ค่าเบี้ยเลี้ยง' | 'ค่าแท็กซี่' | 'ค่ารถ', typeId: number, detailSub?: string): ApprovalItem {
        const defaultUser = {
            name: 'พนักงานทดสอบ',
            employeeId: 'N/A',
            department: 'N/A',
            company: 'บริษัท OTD'
        };

        return {
            requestNo: request.id,
            requestDate: request.createDate,
            requestBy: request.requester || defaultUser,
            requestType: type,
            typeId: typeId,
            requestDetail: request.items[0]?.description || detailSub || '',
            amount: request.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0),
            status: this.mapStatus(request.status)
        };
    }

    public mapMedicalToApproval(req: MedicalRequest): ApprovalItem {
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
            requestType: 'ค่ารักษาพยาบาล',
            typeId: 99,
            requestDetail: req.items.map((i: any) => i.diseaseType).join(', '),
            amount: req.totalRequestedAmount || 0,
            status: this.mapStatus(req.status)
        };
    }

    // แปลงสถานะภาษาไทยเป็นภาษาอังกฤษประเภทต่างๆ
    mapStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
        const statusValue = status?.trim();

        if (statusValue === 'ไม่อนุมัติ') return 'Rejected';
        if (statusValue === 'รอแก้ไข') return 'Referred Back';

        if (statusValue === 'อนุมัติแล้ว' || statusValue.includes('จ่าย')) return 'Approved';

        if (statusValue === 'คำขอใหม่' ||
            statusValue === 'ตรวจสอบแล้ว' ||
            statusValue === 'อยู่ระหว่างการอนุมัติ' ||
            statusValue === 'รอพนักงานยืนยัน' ||
            statusValue === 'รอต้นสังกัดอนุมัติ' ||
            statusValue === 'รอฝ่ายบุคคลอนุมัติ' ||
            statusValue === 'รอผู้บริหารอนุมัติ' ||
            statusValue === 'รอฝ่ายบัญชีอนุมัติ' ||
            statusValue.includes('รอตรวจสอบ')) {
            return 'Pending';
        }

        return 'Pending';
    }
}

import { Injectable, inject } from '@angular/core';
import { AllowanceRequest } from '../interfaces/allowance.interface';
import { TaxiRequest } from './taxi.service';
import { VehicleRequest } from './transport.service';
import { MedicalRequest } from './medicalexpenses.service';
import { ApprovalItem } from '../interfaces/approval.interface';
import { REQUEST_STATUS } from '../constants/request-status.constant';
import { DateUtilityService } from './date-utility.service';

@Injectable({
    providedIn: 'root'
})
export class ApprovalsHelperService {

    private dateUtil = inject(DateUtilityService);

    constructor() { }

    processData(allowance: AllowanceRequest[], taxi: TaxiRequest[], vehicle: VehicleRequest[]): ApprovalItem[] {
        const allowanceItems = allowance.map(item => ({
            requestNo: item.id,
            requestDate: this.dateUtil.formatDateToThaiMonth(item.createDate),
            requestBy: {
                name: item.requester?.name || 'Unknown',
                employeeId: item.requester?.employeeId || 'EM-001',
                department: item.requester?.department || '-',
                company: 'Onee',
                position: 'Software Engineer',
                profileImage: 'assets/images/user-placeholder.png'
            },
            requestType: 'ค่าเบี้ยเลี้ยง' as const,
            typeId: 99,
            requestDetail: item.items.map(i => i.description).join(', ') || 'ค่าเบี้ยเลี้ยงและที่พัก',
            amount: item.items.reduce((sum, i) => sum + i.amount, 0),
            status: this.mapStatus(item.status),
            rawStatus: this.normalizeStatus(item.status),
            type: 'allowance',
            originalData: item
        }));

        const taxiItems = taxi.map(item => ({
            requestNo: item.id,
            requestDate: this.dateUtil.formatDateToThaiMonth(item.createDate),
            requestBy: {
                name: item.requester?.name || 'Unknown',
                employeeId: item.requester?.employeeId || 'EM-002',
                department: item.requester?.department || '-',
                company: 'Onee',
                position: 'Sales Representative',
                profileImage: 'assets/images/user-placeholder.png'
            },
            requestType: 'ค่าแท็กซี่' as const,
            typeId: 99,
            requestDetail: item.items.map(i => i.description).join(', ') || 'เดินทางไปหาลูกค้า',
            amount: item.items.reduce((sum, i) => sum + i.amount, 0),
            status: this.mapStatus(item.status),
            rawStatus: this.normalizeStatus(item.status),
            type: 'taxi',
            originalData: item
        }));

        const vehicleItems = vehicle.map(item => ({
            requestNo: item.id,
            requestDate: this.dateUtil.formatDateToThaiMonth(item.createDate),
            requestBy: {
                name: item.requester?.name || 'Unknown',
                employeeId: item.requester?.employeeId || 'EM-003',
                department: item.requester?.department || '-',
                company: 'Onee',
                position: 'Driver',
                profileImage: 'assets/images/user-placeholder.png'
            },
            requestType: 'ค่ารถ' as const,
            typeId: 99,
            requestDetail: item.items.map(i => i.description).join(', ') || 'ค่าน้ำมันรถ',
            amount: item.items.reduce((sum, i) => sum + i.amount, 0),
            status: this.mapStatus(item.status),
            rawStatus: this.normalizeStatus(item.status),
            type: 'transport',
            originalData: item
        }));

        return [...allowanceItems, ...taxiItems, ...vehicleItems];
    }

    processMedicalData(medicals: MedicalRequest[]): ApprovalItem[] {
        return medicals.map(req => this.mapMedicalToApproval(req));
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
            status: this.mapStatus(req.status),
            rawStatus: this.normalizeStatus(req.status)
        };
    }

    mapStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
        const s = this.normalizeStatus(status);

        if (s === REQUEST_STATUS.REJECTED || s === 'ไม่อนุมัติ') return 'Rejected';
        if (s === REQUEST_STATUS.REFERRED_BACK || s === 'รอแก้ไข') return 'Referred Back';
        if (s === REQUEST_STATUS.APPROVED || s === 'อนุมัติแล้ว' || s.includes('จ่าย')) return 'Approved';

        // Everything else maps to 'Pending'
        return 'Pending';
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Pending': return 'pending';
            case 'Approved': return 'approved';
            case 'Rejected': return 'rejected';
            case 'Referred Back': return 'referred-back';
            default: return 'pending';
        }
    }

    sortData(data: ApprovalItem[], sortId: string, desc: boolean): ApprovalItem[] {
        const direction = desc ? -1 : 1;
        return [...data].sort((itemA, itemB) => {
            switch (sortId) {
                case 'requestNo':
                    return itemA.requestNo.localeCompare(itemB.requestNo) * direction;
                case 'requestDate':
                    // Robust date sorting (Assume DD/MM/YYYY format)
                    const dateA = itemA.requestDate.split(' ')[0].split('/').reverse().join('') || itemA.requestDate;
                    const dateB = itemB.requestDate.split(' ')[0].split('/').reverse().join('') || itemB.requestDate;
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
        if (!status) return REQUEST_STATUS.WAITING_CHECK;
        const s = status.trim();

        // English Mapping
        if (['Pending', 'Waiting Check', 'New'].includes(s)) return REQUEST_STATUS.WAITING_CHECK;
        if (['Approved', 'Approve'].includes(s)) return REQUEST_STATUS.APPROVED;
        if (['Rejected', 'Reject'].includes(s)) return REQUEST_STATUS.REJECTED;
        if (['Referred Back', 'Refer Back'].includes(s)) return REQUEST_STATUS.REFERRED_BACK;
        if (['Verified', 'Verify', 'Checked'].includes(s)) return REQUEST_STATUS.VERIFIED;

        // Thai Mapping (Internal/Legacy)
        if (s === 'รออนุมัติ') return REQUEST_STATUS.WAITING_CHECK;
        if (s === 'อนุมัติแล้ว') return REQUEST_STATUS.APPROVED;
        if (s === 'ไม่อนุมัติ') return REQUEST_STATUS.REJECTED;
        if (s === 'รอแก้ไข') return REQUEST_STATUS.REFERRED_BACK;

        return s;
    }
}

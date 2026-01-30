import { Injectable, inject } from '@angular/core';
import { AllowanceRequest } from '../interfaces/allowance.interface';
import { TaxiRequest } from './taxi.service';
import { VehicleRequest } from './transport.service';
import { MedicalRequest } from './medicalexpenses.service';
import { ApprovalItem } from '../components/modals/approval-detail-modal/approval-detail-modal';
import { DateUtilityService } from './date-utility.service';

@Injectable({
    providedIn: 'root'
})
export class ApprovalsHelperService {

    private dateUtil = inject(DateUtilityService); // Inject here

    constructor() { }

    // รวมและแปลงข้อมูลจากหลาย Service เป็นรูปแบบรายการอนุมัติ
    processData(allowance: AllowanceRequest[], taxi: TaxiRequest[], vehicle: VehicleRequest[]): ApprovalItem[] {
        const allowanceItems = allowance.map(item => ({
            requestNo: item.id,
            requestDate: this.dateUtil.formatDateToThaiMonth(item.createDate),
            requestBy: {
                name: item.requester?.name || 'Unknown',
                employeeId: item.requester?.employeeId || 'EM-001',
                department: item.requester?.department || '-',
                company: 'Onee',
                position: 'Software Engineer', // Mock position
                profileImage: 'assets/images/user-placeholder.png'
            },
            requestType: 'ค่าเบี้ยเลี้ยง' as const,
            typeId: 99, // Added typeId
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

    // แปลงสถานะ Code เป็นสถานะหลัก (รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ, รอแก้ไข)
    // แปลงสถานะ Code เป็นสถานะหลัก (รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ, รอแก้ไข)
    mapStatus(status: string): 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ' | 'รอแก้ไข' {
        const s = this.normalizeStatus(status);

        if (s === 'REJECTED' || s === 'ไม่อนุมัติ') return 'ไม่อนุมัติ';
        if (s === 'REFERRED_BACK' || s === 'รอแก้ไข') return 'รอแก้ไข';
        if (s === 'APPROVED' || s === 'อนุมัติแล้ว' || s.includes('จ่าย')) return 'อนุมัติแล้ว';

        // All pending states
        return 'รออนุมัติ';
    }

    // Sanitize status from mock data to ensure valid codes
    private normalizeStatus(status: string): string {
        if (!status) return 'WAITING_CHECK';
        const s = status.trim();

        // Handle potential legacy values
        if (s === 'Pending' || s === 'Waiting Check' || s === 'New') return 'WAITING_CHECK';
        if (s === 'Approved' || s === 'Approve') return 'APPROVED';
        if (s === 'Rejected' || s === 'Reject') return 'REJECTED';
        if (s === 'Referred Back' || s === 'Refer Back') return 'REFERRED_BACK';

        return s;
    }
}
